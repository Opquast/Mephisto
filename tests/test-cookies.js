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
const {CookieParser, extend} = require("utils");

function make_uri(uri) {
    let ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    return ioService.newURI(uri, null, null);
}

exports.test_simple = function(test) {
    let uri = make_uri('http://www.example.com/');
    let cookie = new CookieParser("test=1", uri);
    
    test.assertEqual(cookie.name, 'test');
    test.assertEqual(cookie.value, '1');
    test.assertEqual(cookie.host, 'www.example.com');
    test.assertEqual(cookie.path, '/');
};

exports.test_domain = function(test) {
    let uri = make_uri('http://www.example.com/');
    let cookie = new CookieParser("test=1; domain=.example.com", uri);
    
    test.assertEqual(cookie.host, '.example.com');
    test.assertEqual(cookie.checkPermission(make_uri('http://www.example.com/')), true);
    test.assertEqual(cookie.checkPermission(make_uri('http://images.example.com/')), true);
    test.assertEqual(cookie.checkPermission(make_uri('http://www.testexample.com/')), false);
};

exports.test_path = function(test) {
    let uri = make_uri('http://www.example.net/');
    let cookie = new CookieParser("test=1; path=/test/", uri);
    
    test.assertEqual(cookie.path, '/test/');
    test.assertEqual(cookie.checkPermission(make_uri('http://www.example.net/')), false);
    test.assertEqual(cookie.checkPermission(make_uri('http://www.example.net/test/')), true);
    test.assertEqual(cookie.checkPermission(make_uri('http://www.example.net/test/foo')), true);
};

exports.test_perm = function(test) {
    let uri = make_uri('http://example.org/');
    let cookie = new CookieParser("test=1; path=/; domain=example.org", uri);
    
    test.assertEqual(cookie.checkPermission(make_uri('http://www.example.org/')), false);
    test.assertEqual(cookie.checkPermission(make_uri('http://example.org/')), true);
    test.assertEqual(cookie.checkPermission(make_uri('http://example.org/foo')), true);
};