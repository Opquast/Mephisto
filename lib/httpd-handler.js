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

const apiUtils = require("api-utils");
const domWindow = require("dom-window");

const {Cc,Ci,Cr,Cu} = require("chrome");
const {setTimeout, clearTimeout} = require("timer");
const {extend, parseQueryString, CookieParser} = require("utils");

const wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
const force_refresh = Ci.nsIWebNavigation.LOAD_FLAGS_BYPASS_CACHE;

// This function registers special handlers on HTTP server (defined by
// "server").
// With options, you can register callbacks that will be called on some events
// during or after page load. Every callback have a RequestProcessor as "this". 
//
// * onInit(): Called by RequestProcessor constructor
// * onReady(evt): Called when tab is ready (DOM is loaded)
// * onRequestLogStart(request, listener): Called on every request start
// * onRequestLogStop(request, listener): Called on every request stop
// * onLoad(evt): Called on tab full loaded
// * onTimeout(): Called after a delay if page is not fully loaded
// * onBeforeClose(): Called 1 sec after onLoad (or after onTimeout)
// * onClose(evt): Called on tab close
//
exports.register_handler = function(server, path, options) {
    let path = path;
    let options = apiUtils.validateOptions(options, {
        onInit: {
            is: ["undefined", "function"],
        },
        onReady: {
            is: ["undefined", "function"],
        },
        onRequestLogStart: {
            is: ["undefined", "function"],
        },
        onRequestLogStop: {
            is: ["undefined", "function"],
        },
        onLoad: {
            is: ["undefined", "function"],
        },
        onBeforeClose: {
            is: ["undefined", "function"],
        },
        onTimeout: {
            is: ["undefined", "function"],
        },
        onClose: {
            is: ["undefined", "function"]
        }
    });
    
    let process = function(request, response) {
        response.processAsync();
        try {
            var processor = new RequestProcessor(request, response, options);
            if (!response._finished) {
                processor.process();
            }
        } catch(e) {
            if (typeof(processor) === "undefined") {
                console.exception(e);
                throw(e);
            } else {
                processor.closeTab();
                processor.raiseError(e);
            }
            if (!response._finished) {
                response.finish();
            }
        }
    };
    
    server.registerPathHandler(path, process);
}

function ProgressListener(target) {
    this.target = target;
}
ProgressListener.prototype= {
    QueryInterface: function(aIID){
        if (aIID.equals(Ci.nsIWebProgressListener) ||
        aIID.equals(Ci.nsISupportsWeakReference) ||
        aIID.equals(Ci.nsISupports))
            return this;
       console.error("Something bad happened:)");
       throw(Cr.NS_NOINTERFACE);
    },
    
    // Once main request starts, we trigger onStartTransfering() on target.
    onStateChange: function(progress, request, flags, status) {
        if (flags & Ci.nsIWebProgressListener.STATE_TRANSFERRING) {
            this.target.onStartTransfering();
            this.target.tabBrowser.removeProgressListener(this);
        }
    }
};

function RequestProcessor(request, response, options) {
    this.request = request;     // HTTP request object
    this.response = response;   // HTTP response object
    this.options = options;
    
    this.request.GET = parseQueryString(this.request.queryString);
    
    // Opening a new tab
    this.window = wm.getMostRecentWindow("navigator:browser");
    this.tab = this.window.gBrowser.addTab("about:blank");
    this.tabBrowser = this.window.gBrowser.getBrowserForTab(this.tab);
    this.sandbox = null;
    
    this.timeout = null;
    
    // Bind events
    this.onReady = this.onReady.bind(this);
    this.onLoad = this.onLoad.bind(this);
    this._onFullLoad = this._onFullLoad.bind(this);
    this.onTimeout = this.onTimeout.bind(this);
    this.onClose = this.onClose.bind(this);
    
    // Events
    this.tabBrowser.addEventListener("DOMContentLoaded", this.onReady, true);
    this.tabBrowser.addEventListener("load", this.onLoad, true);
    this.tab.addEventListener("TabClose", this.onClose, true);
    
    // Fake "events" for received requests
    this.tabBrowser.RequestModifyEvent = this.onRequestModify.bind(this);
    this.tabBrowser.RequestLogStartEvent = this.onRequestLogStart.bind(this);
    this.tabBrowser.RequestLogStopEvent = this.onRequestLogStop.bind(this);
    
    if (typeof(this.options.onInit) == "function") {
        try {
            this.options.onInit.call(this);
        } catch(e) {
            this.raiseError(e);
        }
    }
}

RequestProcessor.prototype = {
    closeTab: function(remove_event) {
        remove_event = remove_event || false;
        if (this.tab !== null) {
            if (remove_event) {
                this.tab.removeEventListener("TabClose", this.onClose, true);
            }
            this.window.gBrowser.removeTab(this.tab);
            this.tab = null;
        }
    },
    
    raiseError: function(e) {
        this.closeTab(true);
        if (!this.response._finished) {
            this.send500(new String(e) + "\n");
        }
        console.exception(e);
    },
    
    sendStatus: function(code, code_str, body) {
        this.closeTab(true);
        this.response.setStatusLine(this.request.httpVersion, code, code_str);
        this.response.setHeader('Content-Type', 'text/plain', false);
        this.response.write(body);
        this.response.finish();
    },
    send404: function(msg) {
        this.sendStatus(404, "Not Found", msg);
    },
    send406: function(msg) {
        this.sendStatus(406, "Not Acceptable", msg);
    },
    send500: function(msg) {
        this.sendStatus(500, "Internal Server Error", msg);
    },
    
    process: function() {
        let url = this.request.GET.get('url');
        if (!url) {
            this.send406("No URL provided.\n");
            return;
        }
        
        // Make nsIURI object
        let ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        this.origin_uri = ioService.newURI(url, null, null);
        
        // Let start
        let pl = new ProgressListener(this);
        this.tabBrowser.addProgressListener(pl, Ci.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
        
        this.timeout = setTimeout(this.onTimeout, 20000);
        this.tabBrowser.loadURIWithFlags(url, force_refresh, null, null, null);
        console.info('OPEN TAB - ' + url);
    },
    
    onStartTransfering: function() {
        console.debug('TRANSFER STARTS');
        // Adding overrided window to document window
        extend(
            this.tabBrowser.contentDocument.defaultView.wrappedJSObject,
            domWindow.window
        );
    },
    
    onReady: function(evt) {
        try {
            if (evt.target.defaultView.location.href == "about:blank") {
                return;
            }
            
            this.tabBrowser.removeEventListener("DOMContentLoaded", this.onReady, true);
            console.debug("READY");
            if (typeof(this.options.onReady) !== "undefined") {
                this.options.onReady.call(this, evt);
            }
        } catch(e) {
            this.raiseError(e);
        }
    },
    
    onRequestModify: function(request) {
        // First we remove Cookies and HTTP Authentication headers
        request.setRequestHeader('Authorization', null, false);
        request.setRequestHeader('Cookie', null, false);
        
        // Adding HTTP authentication header
        if (this.request.hasHeader('Authorization')) {
            let auth_info = this.request.getHeader('Authorization');
            if (this.origin_uri.host == request.URI.host &&
                this.origin_uri.port == request.URI.port)
            {
                request.setRequestHeader('Authorization', auth_info, false);
                console.debug('Header: Authorization ' + request.URI.spec);
            }
        }
        
        // Adding cookie header
        if (this.request.hasHeader('Set-Cookie')) {
            let cookies = this.request._headers.getHeaderValues('set-cookie');
            for (var i=0; i<cookies.length; i++) {
                let c = new CookieParser(cookies[i], this.origin_uri);
                if (c.checkPermission(request.URI)) {
                    request.setRequestHeader('Cookie', c.raw, true);
                    console.debug('Cookie: ' + c.name + ' ' + request.URI.spec);
                }
            }
        }
    },
    
    onRequestLogStart: function(request, listener) {
        try {
            if (typeof(this.options.onRequestLogStart) !== "undefined") {
                this.options.onRequestLogStart.call(this, request, listener);
            }
        } catch(e) {
            this.raiseError(e);
        }
    },
    
    onRequestLogStop: function(request, listener) {
        try {
            if (typeof(this.options.onRequestLogStop) !== "undefined") {
                this.options.onRequestLogStop.call(this, request, listener);
            }
        } catch(e) {
            this.raiseError(e);
        }
    },
    
    onLoad: function(evt) {
        try {
            if (evt.target.defaultView.location.href == "about:blank") {
                return;
            }
            
            this.tabBrowser.removeEventListener("load", this.onLoad, true);
            
            if (this.timeout !== null) {
                clearTimeout(this.timeout);
            }
            
            setTimeout(this._onFullLoad, 1000);
            
            console.debug("LOADED");
            if (typeof(this.options.onLoad) !== "undefined") {
                this.options.onLoad.call(this, evt);
            }
        } catch(e) {
            this.raiseError(e);
        }
    },
    
    _onFullLoad: function() {
        this.tabBrowser.stop();
        console.debug("FULL LOAD");
        
        this.onBeforeClose();
        this.closeTab();
    },
    
    onTimeout: function(evt) {
        try {
            console.debug('TIMEOUT');
            this.tabBrowser.removeEventListener("load", this.onLoad, true);
            this.tabBrowser.stop();
            if (typeof(this.options.onTimeout) !== "undefined") {
                this.options.onTimeout.call(this, evt);
            }
            this.onBeforeClose();
            this.closeTab();
        } catch(e) {
            this.raiseError(e);
        }
    },
    
    onBeforeClose: function() {
        try {
            if (typeof(this.options.onBeforeClose) !== "undefined") {
                this.options.onBeforeClose.call(this);
            }
        } catch(e) {
            this.raiseError(e);
        }
    },
    
    onClose: function(evt) {
        try {
            console.debug("CLOSED");
            if (typeof(this.options.onClose) !== "undefined") {
                this.options.onClose.call(this, evt);
            }
            this.response.finish();
        } catch(e) {
            this.raiseError(e);
        }
    },
    
    callModifiers: function(sidecar) {
        let modifiers = this.request.GET.getlist('modifier');
        let result = {};
        
        for (var i=0; i<modifiers.length; i++) {
            let _modifier = this.evalJSURI(modifiers[i], sidecar);
            if (typeof(_modifier) == 'object') {
                extend(result, _modifier);
            }
        }
        
        return result;
    },
    
    evalJS: function(code, sidecar) {
        if (this.sandbox == null) {
            this.sandbox = new Cu.Sandbox(
                Cc["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal)
            );
            this.sandbox.window = this.tabBrowser.contentDocument.defaultView.wrappedJSObject;
            this.sandbox.__proto__ = this.sandbox.window;
            this.sandbox.console = console;
            this.sandbox.sidecar = sidecar;
        }
        
        try {
            return Cu.evalInSandbox(code, this.sandbox);
        } catch(e) {
            console.exception(e);
        }
    },
    
    evalJSURI: function(uri, sidecar) {
        if (uri.search(/^(http|https):\/\//) == 0) {
            let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
            try {
                req.open('GET', uri, false);
                req.send(null);
                if (req.status == 200) {
                    return this.evalJS(req.responseText, sidecar);
                }
            } catch (e) {
                console.error('Unable to open modifier ' + uri);
                console.error(e);
            }
        } else {
            try {
                let fn = null;
                if (uri.search(/^file:\/\//) == 0) {
                    fn = uri.replace(/^file:\/\//, '');
                } else {
                    fn = require("url").toFilename(require("self").data.url('modifiers/' + uri));
                }
                
                if (!require("file").isFile(fn)) {
                    throw "File " + fn + " does not exists.";
                }
                
                return this.evalJS(require("file").read(fn), sidecar);
            } catch(e) {
                console.error('Unable to open modifier ' + uri);
                console.error(e);
            }
        }
    },
    
    screenshot: function(width, height) {
        width = width || 1024;
        height = height || 700;
        
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
        
        let result = canvas.mozGetAsFile("screenshot", "image/png");
        delete(ctx, canvas);
        return result;
    }
}