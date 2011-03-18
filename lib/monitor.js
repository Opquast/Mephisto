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

// Monitoring HTTP handlers

const {Cc, Ci} = require("chrome");

const wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
const mgr = Cc["@mozilla.org/memory-reporter-manager;1"].getService(Ci.nsIMemoryReporterManager);

exports.main = function(request, response) {
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
        response.write(objectToTxt(result));
    }
};

function objectToTxt(obj, prefix) {
    // Simple object to plain/text converter.
    prefix = prefix || "";
    var res = "";
    for (var i in obj) {
        if (typeof(obj[i]) == 'object') {
            res += objectToTxt(obj[i], i + '_');
        } else {
            res += prefix + i + ":\t" + obj[i] + "\n";
        }
    }
    
    return res;
};