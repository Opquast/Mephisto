/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mephisto.
 *
 * The Initial Developer of the Original Code is
 * Temesis SARL.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Olivier Meunier <olivier.meunier@temesis.com> (Original Author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const {Cc, Ci} = require("chrome");
const self = require("self");
const url = require("url");

const requestInfo = require("request-info");
const {extend} = require("utils");

var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
var mgr = Cc["@mozilla.org/memory-reporter-manager;1"].getService(Ci.nsIMemoryReporterManager);

exports.register_data_dir = function(server, path, dirname) {
    // Utility function to register a path located in data directory.
    // Used by unit tests
    let fp = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    fp.initWithPath(url.toFilename(self.data.url(dirname)));
    server.registerDirectory(path, fp);
};

exports.loaders = {
    // Simple DOM dump
    '/': {
        onInit: function() {
            this.result = null;
        },
        onBeforeClose: function() {
            let serializer = new this.tabBrowser.contentWindow.XMLSerializer();
            this.result = unescape(encodeURIComponent(
                serializer.serializeToString(this.tabBrowser.contentDocument)
            ));
        },
        onClose: function(evt) {
            this.response.setHeader('Content-Type', 'text/plain; charset=UTF-8', false);
            this.response.write(this.result);
        }
    },
    
    // Full page dump as a JSON object
    '/dump': {
        onInit: function() {
            this.started_log = [];
            this.stopped_log = {};
            this.base_url = null;
            this.content_html = null;
            this.result = {};
        },
        onRequestLogStart: function(request, listener) {
            // We want requests in order. Then, we start to keep a log of
            // all started requests. Some requests are sometime duplicated
            // and we ignore them with this test.
            if (this.started_log.length == 0 || this.started_log[this.started_log.length - 1] != request.URI.spec) {
                this.started_log.push(request.URI.spec);
            }
        },
        onRequestLogStop: function(request, listener) {
            // Once a request has finished, we store information.
            if (typeof(request.URI) == "undefined") {
                // Discard requests stopped after tab close.
                return;
            }
            this.stopped_log[request.URI.spec] = requestInfo.request_info(request, listener);
        },
        onBeforeClose: function() {
            let serializer = new this.tabBrowser.contentWindow.XMLSerializer();
            let content_html = unescape(encodeURIComponent(
                serializer.serializeToString(this.tabBrowser.contentDocument)
            ));
            
            var requests = [], req_details;
        
            // We now cross started_log and stopped_log to get request details
            // in order of execution.
            for (var i=0; i<this.started_log.length; i++) {
                req_details = this.stopped_log[this.started_log[i]];
                if (typeof(req_details) !== "undefined") {
                    requests.push(req_details);
                }
            }
        
            // Adding resources and dom tree to result
            extend(this.result, {
                'resources': requests,
                'dom': content_html
            });
            
            // Call modifiers
            let modifiers = this.callModifiers({'resources': requests});
            extend(modifiers, this.result);
            this.result = modifiers;
        },
        onClose: function(evt) {
            this.response.setHeader('Content-Type', 'application/json; charset=UTF-8', false);
            this.response.write(JSON.stringify(this.result));
        }
    },
    
    // Screenshot
    '/screenshot': {
        onInit: function() {
            this.result = null;
        },
        onBeforeClose: function() {
            let width = this.request.GET.get('w') || 1024;
            let height = this.request.GET.get('h') || 700;
        
            this.tabBrowser.contentWindow.resizeTo(1024, 700);
            this.tabBrowser.contentWindow.scrollbars.visible = true;
            let w = this.tabBrowser.contentDocument.width;
            let h = height * w/width;
        
            let canvas = this.tabBrowser.contentDocument.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
        
            let ctx = canvas.getContext("2d");
            ctx.fillStyle = "rgb(255,255,255)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(width/w, width/w);
            ctx.drawWindow(this.tabBrowser.contentWindow, 0, 0, w, h, "rgb(255,255,255)");
            ctx.restore();
        
            this.result = canvas.mozGetAsFile("shot", "image/png");
            delete(ctx, canvas);
        },
        onClose: function(evt) {
            this.response.setHeader('Content-Type', 'image/png', false);
            this.response.bodyOutputStream.write(this.result.getAsBinary(), this.result.size);
        }
    }
};

exports.basic = {
    '/monitor': function(request, response) {
        var result = {
            'window_count': 0,
            'tab_count': 0,
            'tabs': [],
            'memory': {}
        }
        
        // Windows and Tabs report
        var browserEnumerator = wm.getEnumerator("navigator:browser");
        var win = null;
        while (browserEnumerator.hasMoreElements()) {
            result.window_count += 1;
            win = browserEnumerator.getNext();
            result.tab_count += win.gBrowser.browsers.length;

            // List all tabs URI
            for (var i=0; i<win.gBrowser.browsers.length; i++) {
                result.tabs.push(win.gBrowser.getBrowserAtIndex(i).currentURI.spec);
            }
        }

        // Memory report
        var e = mgr.enumerateReporters();
        while (e.hasMoreElements()) {
            var mr = e.getNext().QueryInterface(Ci.nsIMemoryReporter);
            result.memory[mr.path] = mr.memoryUsed;
        }

        if (request.hasHeader('accept') && request.getHeader('accept').search("application/json") != -1) {
            response.setHeader('Content-Type', 'application/json; charset=UTF-8', false);
            response.write(JSON.stringify(result));
        } else {
            response.setHeader('Content-Type', 'text/plain; charset=UTF-8', false);
            response.write(require("utils").objectToTxt(result));
        }
    }
};