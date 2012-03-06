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

// Exported window object allows you to modify a browser window and force it
// to never block on alerts, prompts, etc.

const domConsole = {
    log: function(msg) {
        console.debug('DOM Console: ' + msg);
    }
}

exports.window = {
    console: domConsole,

    // Route alerts to console
    alert: function(msg) {
        console.debug('window.alert attempt: ' + msg);
        return true;
    },

    // Disable back()
    back: function() {
        console.debug('window.back attempt');
    },

    // Disable close()
    close: function() {
        console.debug('window.close attempt');
    },

    // Route confirm to console
    confirm: function(msg) {
        console.debug('window.confirm attempt: ' + msg);
        return true;
    },

    // Route dump to console
    dump: function(msg) {
        console.debug('window.dump attempt: ' + msg);
    },

    // Disable forward()
    forward: function() {
        console.debug('window.forward attempt');
    },

    // Disable home()
    home: function() {
        console.debug('window.home attempt');
    },

    // Disable open()
    open: function(url) {
        console.debug('window.open attempt: ' + url);
        return null;
    },

    // Disable openDialog()
    openDialog: function(url) {
        console.debug('window.openDialog attempt: ' + url);
        return null;
    },

    // Disable print()
    print: function() {
        console.debug('window.print attempt');
    },

    // Route prompt to console
    prompt: function(msg) {
        console.debug('window.prompt attempt: ' + msg);
        return "";
    },

    // Disable showModalDialog
    showModalDialog: function(url) {
        console.debug('window.showModalDialog attempt: ' + url);
        return null;
    }
};
