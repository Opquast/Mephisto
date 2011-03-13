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

(function() {
    var links = [], images = [], body = $('body', document);
    
    function encoded(val) {
        if (val !== undefined && val !== null) {
            val = unescape(encodeURIComponent(val));
        }
        return val;
    }
    
    function get_head_links(rel) {
        $('head>link[href][rel='+rel+']', document).each(function() {
            links.push({
                'uri': this.href,
                'href': encoded(this.getAttribute('href')),
                'label': encoded(this.getAttribute('title')),
                'rel': encoded(this.getAttribute('rel'))
            })
        })
    }
    
    function get_stats(root) {
        return {
            'tables': $('table', root).length,
            'data_tables': $('table:has(th, summary)', root).length,
            'forms': $('form', root).length,
            'lists': $('ul, ol, dl', root).length,
            'styles': {
                'font': $('font', root).length,
                'tt': $('tt', root).length,
                'i': $('i', root).length,
                'b': $('b', root).length,
                'big': $('big', root).length,
                'small': $('small', root).length,
                'strike': $('strike', root).length,
                's': $('s', root).length,
                'u': $('u', root).length
            }
        }
    }
    
    // Links
    get_head_links('chapter');
    get_head_links('contents');
    get_head_links('next');
    get_head_links('previous');
    get_head_links('top');
    
    $('a[href]', body).each(function() {
        links.push({
            'uri': this.href,
            'href': encoded(this.getAttribute('href')),
            'label': encoded(this.textContent),
            'rel': encoded(this.getAttribute('rel'))
        });
    });
    
    // Images
    $('img[src]', body).each(function() {
        images.push({
            'uri': this.src,
            'src': encoded(this.getAttribute('src')),
            'alt': encoded(this.getAttribute('alt'))
        })
    });
    
    // Title
    var title = $('head>title');
    if (title.length == 0) {
        title = null;
    } else {
        title = encoded(title.text());
    }
    
    var stats = get_stats(body);
    stats['images'] = images.length;
    stats['links'] = links.length;
    
    return {
        'title': title,
        'links': links,
        'images': images,
        'stats': stats
    };
})()