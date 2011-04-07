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
const wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

function extend() {
    // Extend function from JQuery
    var options, name, src, copy, copyIsArray, clone,
    target = arguments[0] || {},
    i = 1,
    length = arguments.length,
    deep = false;
    
    // Handle a deep copy situation
    if ( typeof target === "boolean" ) {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
    }
    
    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== "object" && typeof(target) !== "function") {
        target = {};
    }
    
    // extend jQuery itself if only one argument is passed
    if ( length === i ) {
        target = this;
        --i;
    }
    
    for ( ; i < length; i++ ) {
        // Only deal with non-null/undefined values
        if ( (options = arguments[ i ]) != null ) {
            // Extend the base object
            for ( name in options ) {
                src = target[ name ];
                copy = options[ name ];
                
                // Prevent never-ending loop
                if ( target === copy ) {
                    continue;
                }
                
                // Recurse if we're merging plain objects or arrays
                if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
                    if ( copyIsArray ) {
                        copyIsArray = false;
                        clone = src && jQuery.isArray(src) ? src : [];
                    } else {
                        clone = src && jQuery.isPlainObject(src) ? src : {};
                    }
                    
                    // Never move original objects, clone them
                    target[ name ] = jQuery.extend( deep, clone, copy );
                    
                    // Don't bring in undefined values
                } else if ( copy !== undefined ) {
                    target[ name ] = copy;
                }
            }
        }
    }
    
    // Return the modified object
    return target;
};
exports.extend = extend;

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
exports.objectToTxt = objectToTxt;

function QueryStringArgs(qs) {
    this.params = {};
    if (!qs) {
        return;
    }
    let tokens = qs.split("&");
    for (var i=0; i<tokens.length; i++) {
        let token = tokens[i];
        let param = token.split("=", 2);
        let name = decodeURIComponent(param[0]);
        let value = decodeURIComponent(param[1]);
        
        if (name.search(/\[\d+\]$/) != -1) {
            // Parsing arguments with the form n[0]=v
            name = name.replace(/\[\d+\]$/, '');
        }
        
        if (typeof(this.params[name]) === "undefined") {
            this.params[name] = [];
        }
        this.params[name].push(value);
    }
}
QueryStringArgs.prototype = {
    get: function(name) {
        let value = this.getlist(name);
        if (value.lenght == 0) {
            return null;
        }
        return value[0];
    },
    getlist: function(name) {
        return this.params[name] || [];
    }
};

function parseQueryString(qs) {
    return new QueryStringArgs(qs);
}
exports.parseQueryString = parseQueryString;

function getTabBrowserForRequest(request) {
    let win = wm.getMostRecentWindow("navigator:browser");
    let domwin = getWindowForRequest(request);
    if (!domwin) {
        return null;
    }
    return win.gBrowser.getBrowserForDocument(domwin.top.document);
}
exports.getTabBrowserForRequest = getTabBrowserForRequest;

function getWindowForRequest(request) {
    var loadContext = getRequestLoadContext(request);
    try {
        if (loadContext) {
            return loadContext.associatedWindow;
        }
    }
    catch (e) {}

    return null;
}
exports.getWindowForRequest = getWindowForRequest;

function getRequestLoadContext(request) {
    try {
        if (request && request.notificationCallbacks) {
            return request.notificationCallbacks.getInterface(Ci.nsILoadContext);
        }
    } catch (exc) {}

    try {
        if (request && request.loadGroup && request.loadGroup.notificationCallbacks) {
            return request.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);
        }
    } catch (e) {}
    
    return null;
}
exports.getRequestLoadContext = getRequestLoadContext;

function CookieParser(cookie_string, base_uri) {
    this.raw = null;
    this.name = null;
    this.value = null;
    this.host = base_uri.host;
    this.path = base_uri.path;
    
    cookie_string.split(";").forEach(function(v, i, p) {
        v = v.trim();
        let eq = v.indexOf("=");
        let name, value;
        if (eq == -1) {
            name = v;
            value = true;
        } else {
            name = v.slice(0, eq);
            value = v.slice(eq + 1);
        }
        
        if (i == 0) {
            this.raw = v;
            this.name = name;
            this.value = decodeURIComponent(value);
        } else if (name.toLowerCase() == 'domain') {
            this.host = value;
        } else if (name.toLowerCase() == 'path') {
            this.path = value;
        }
    }, this);
}
CookieParser.prototype = {
    _checkHost: function(URI) {
        if (this.host.indexOf('.') == 0) {
            return (
                this.host.length < URI.host.length &&
                URI.host.substr(URI.host.length - this.host.length) == this.host
            );
        }
        return this.host == URI.host;
    },
    _checkPath: function(URI) {
        return URI.path.indexOf(this.path) === 0;
    },
    checkPermission: function(URI) {
        return this._checkHost(URI) && this._checkPath(URI);
    }
};
exports.CookieParser = CookieParser;