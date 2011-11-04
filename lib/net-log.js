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

const {Cc, Ci, Cr} = require("chrome");
const {getTabBrowserForRequest} = require("utils");

var httpRequestObserver = {
    observe: function(aSubject, aTopic, aData) {
        if (aTopic == "http-on-examine-response" || aTopic == "http-on-examine-cached-response") {
            var newListener = new TracingListener();
            aSubject.QueryInterface(Ci.nsITraceableChannel);
            
            newListener.originalListener = aSubject.setNewListener(newListener);
        }
        else if (aTopic == "http-on-modify-request") {
            aSubject.QueryInterface(Ci.nsIHttpChannel);
            let tabBrowser = getTabBrowserForRequest(aSubject);
            if (tabBrowser && typeof(tabBrowser.RequestModifyEvent) !== "undefined") {
                tabBrowser.RequestModifyEvent(aSubject);
            }
        }
    },
    
    QueryInterface : function (aIID) {
        if (aIID.equals(Ci.nsIObserver) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        
        throw Cr.NS_NOINTERFACE;
    }
};
exports.httpRequestObserver = httpRequestObserver;


function TracingListener() {
}
TracingListener.prototype =
{
    originalListener: null,
    receivedData: null,
    tabBrowser: null,
    
    onStartRequest: function(request, context) {
        this.receivedData = [];
        this.originalListener.onStartRequest(request, context);
        
        request.QueryInterface(Ci.nsIHttpChannel);
        this.tabBrowser = getTabBrowserForRequest(request);
        if (this.tabBrowser && typeof(this.tabBrowser.RequestLogStartEvent) !== 'undefined') {
            this.tabBrowser.RequestLogStartEvent(request, this);
        };
    },
    
    onDataAvailable: function(request, context, inputStream, offset, count)
    {
        if (this.tabBrowser === null) {
            this.originalListener.onDataAvailable(request, context, inputStream, offset, count);
        } else {
            var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"]
                                    .createInstance(Ci.nsIBinaryInputStream);
            var storageStream = Cc["@mozilla.org/storagestream;1"]
                                    .createInstance(Ci.nsIStorageStream);
            var binaryOutputStream = Cc["@mozilla.org/binaryoutputstream;1"]
                                    .createInstance(Ci.nsIBinaryOutputStream);

            binaryInputStream.setInputStream(inputStream);
            storageStream.init(8192, count, null);
            binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

            // Copy received data as they come.
            var data = binaryInputStream.readBytes(count);
            this.receivedData.push(data);

            binaryOutputStream.writeBytes(data, count);

            this.originalListener.onDataAvailable(request, context,
                storageStream.newInputStream(0), offset, count);
        }
    },
    
    onStopRequest: function(request, context, statusCode)
    {
        this.originalListener.onStopRequest(request, context, statusCode);

        request.QueryInterface(Ci.nsIHttpChannel);
        if (this.tabBrowser && typeof(this.tabBrowser.RequestLogStopEvent) !== 'undefined') {
            // Note: we send "this" to pseudo event, thus we can read data
            // on "receivedData" property.
            this.tabBrowser.RequestLogStopEvent(request, this);
        };
    },
    
    QueryInterface: function (aIID) {
        if (aIID.equals(Ci.nsIStreamListener) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        throw Cr.NS_NOINTERFACE;
    }
}
