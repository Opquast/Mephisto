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

exports.main = function() {
    const {Cc, Ci} = require("chrome");
    const observer = require("observer-service");
    const preferences = require("preferences-service");
    const self = require("self");

    const {nsHttpServer} = require("httpd");
    const {register_handler} = require("httpd-handler");
    const {httpRequestObserver} = require("net-log");
    const views = require("views");

    if (preferences.get('extensions.mephisto.logLevel') === undefined) {
        console.level = 3;
    } else {
        console.level = preferences.get('extensions.mephisto.logLevel')
    }
    require("console-logger");

    // Addon & Browser version
    const info = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
    console.log('Starting ' + self.name + ' ' + self.version + ' / ' + info.name + ' ' + info.version);

    // Network Observer
    observer.add('http-on-examine-response', httpRequestObserver);
    observer.add('http-on-examine-cached-response', httpRequestObserver);
    observer.add('http-on-modify-request', httpRequestObserver);

    // Preferences
    var server_host = preferences.get('extensions.mephisto.serverHost');
    var server_port = preferences.get('extensions.mephisto.serverPort');
    var override_prefs = preferences.get('extensions.mephisto.overridePrefs');
    if (typeof(server_host) === "undefined") {
        server_host = '127.0.0.1';
        preferences.set('extensions.mephisto.serverHost', server_host);
    }
    if (typeof(server_port) === "undefined") {
        server_port = 9000;
        preferences.set('extensions.mephisto.serverPort', server_port);
    }
    if (typeof(override_prefs) === "undefined") {
        override_prefs = true;
        preferences.set('extensions.mephisto.overridePrefs', override_prefs);
    }

    // We force some preferences
    if (override_prefs) {
        preferences.set('browser.cache.disk.enable', false);
        preferences.set('browser.cache.memory.enable', true);
        preferences.set('dom.max_script_run_time', 0);
        preferences.set('dom.max_chrome_script_run_time', 0);

        preferences.set('network.prefetch-next', false);
        preferences.set('network.http.pipelining', true);
        preferences.set('network.http.http.proxy.pipelining', true);

        preferences.set('nglayout.initialpaint.delay', 0);

        preferences.set('images.animation_mode', 'none');
        preferences.set('content.interrupt.parsing', false);
        preferences.set('accessibility.blockautorefresh', true);
    }

    // HTTP Server
    var server = new nsHttpServer();

    // URL Loader Views
    for (var path in views.loaders) {
        register_handler(server, path, views.loaders[path]);
    }

    // Basic Views
    for (var path in views.basic) {
        server.registerPathHandler(path, views.basic[path]);
    }

    // Start server
    server._start(server_port, server_host);
    server.identity.setPrimary("http", server_host, server_port);

    require('unload').when(function cleanup() {
        server.stop(function() {});
    })

    console.log('Server running on ' + server_host + ':' + server_port + '...');
    return server;
};
