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

const main = require("main");
const preferences = require("preferences-service");
const {extend} = require("utils");
const {register_data_dir} = require("views");

// Starting main program
server = main.main();

// Adding tests handler
register_data_dir(server, '/tests/', 'tests');

const server_host = preferences.get('extensions.mephisto.serverHost');
const server_port = preferences.get('extensions.mephisto.serverPort');

function serverGet(options) {
    if (options.url == undefined) {
        options.url = "http://" + server_host + ":" + server_port + '/';
    }
    require("request").Request(options).get();
}

function serverGetTest(path, options) {
    options.url = "http://" + server_host + ":" + server_port + "/dump";
    options.content = options.content || {};
    
    extend(options.content, {
        'url': "http://" + server_host + ":" + server_port + "/tests/" + path
    })
    serverGet(options);
}

exports.test_serve = function(test) {
    serverGet({
        content: {
            url: 'http://google.com/'
        },
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.assertEqual(response.headers['Content-Type'].search(/^text\/plain/), 0);
            test.done();
        }
    });
    test.waitUntilDone(20000);
};

exports.test_base = function(test) {
    serverGetTest('index.html', {
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.assertEqual(response.json.resources.length, 1);
            test.done();
        }
    });
    test.waitUntilDone(20000);
};

exports.test_window = function(test) {
    serverGetTest('window-features.html', {
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.done();
        }
    });
    test.waitUntilDone(20000);
};

exports.test_modifiers = function(test) {
    serverGetTest('index.html', {
        content: {
            'modifier': ['jquery.js', 'extractor.js']
        },
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.assertEqual(response.json.links.length, 1);
            test.done();
        }
    });
    test.waitUntilDone(20000);
};

exports.test_modifiers_remote = function(test) {
    serverGetTest('index.html', {
        content: {
            'modifier': ['http://ajax.googleapis.com/ajax/libs/jquery/1.5.2/jquery.min.js', 'extractor.js']
        },
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.assertEqual(response.json.links.length, 1);
            test.done();
        }
    });
    test.waitUntilDone(20000);
}

exports.test_modifiers_file = function(test) {
    var {toFilename} = require("url");
    var self = require("self");
    var modifiers = [
        'file://' + toFilename(self.data.url('modifiers/jquery.js')),
        'file://' + toFilename(self.data.url('modifiers/extractor.js'))
    ];
    
    serverGetTest('index.html', {
        content: {
            'modifier': modifiers
        },
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.assertEqual(response.json.links.length, 1);
            test.done();
        }
    });
    test.waitUntilDone(20000);
}

exports.test_monitor = function(test) {
    require("request").Request({
        headers: {"Accept": "application/json"},
        url: "http://" + server_host + ":" + server_port + "/monitor",
        onComplete: function(response) {
            test.assertEqual(response.headers['Content-Type'].search(/^application\/json/), 0);
            test.assertEqual(response.json.tab_count, 1);
            test.done();
        }
    }).get();
    test.waitUntilDone(20000);
};