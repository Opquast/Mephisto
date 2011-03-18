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

const re_charset = new RegExp('charset=([^\s^"]+)', "i");

exports.request_info = function(request, listener) {
    let out = {
        uri: request.URI.spec,
        referrer: request.referrer != null ? request.referrer.spec : "",
        method: request.requestMethod,
        status: request.responseStatus,
        status_text: request.responseStatusText,
        date: null,
        modified: null,
        expires: null,
        content_type: null,
        charset: null,
        size: listener.receivedData.join('').length,
        headers: {}
    };
    
    var visit_header = (function(name, value) {
        this.headers[name.toLowerCase()] = value;
    }).bind(out);
    
    request.visitResponseHeaders({
        visitHeader: visit_header
    });
    
    [out.content_type, out.charset] = get_content_type(out.headers);
    
    out.date = get_date(out.headers, 'date');
    out.modified = get_date(out.headers, 'last-modified');
    out.expires = get_date(out.headers, 'expires');
    
    if (out.content_type !== null && out.content_type.search(/^image\//) !== -1) {
        //out.image_info = {};
        //[out.image_info.width, out.image_info.height] = get_image_info(out.uri, listener);
    }
    return out;
};

var get_content_type = function(headers) {
    let charset = null;
    let content_type = null;
    
    if (typeof(headers['content-type']) !== "undefined") {
        content_type = headers['content-type'].split(';',2);
        
        if (content_type.length > 1) {
            let match = re_charset.exec(content_type[1]);
            if(match) {
                charset = match[1].trim();
            }
        }
        content_type = content_type[0].trim();
    }
    
    return [content_type, charset]
}

var get_date = function(headers, name) {
    if (typeof(headers[name]) !== 'undefined') {
        if (isNaN(Date.parse(headers[name]))) {
            return null;
        }
        return headers[name];
    }
    return null;
};

var get_image_info = function(uri, listener) {
    let img = listener.tabBrowser.contentWindow.Image()
    img.src = uri;
    return [img.width, img.height];
};