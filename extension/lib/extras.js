"use strict";

const {Cc, Ci, Cr} = require("chrome");
const Q = require("sdk/core/promise");

const esl = Cc["@mozilla.org/eventlistenerservice;1"]
            .getService(Ci.nsIEventListenerService);
const dnsService = Cc["@mozilla.org/network/dns-service;1"]
            .createInstance(Ci.nsIDNSService);
const threadManager = Cc["@mozilla.org/thread-manager;1"]
            .getService(Ci.nsIThreadManager);
const xmlhttprequest = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"];


const extractEvents = function(win) {
    var tw = win.document.createTreeWalker(
        win.document,
        win.NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: function(node){
                return win.NodeFilter.FILTER_ACCEPT
            }
        },
        false
    );
    var events = [];

    do {
        var event_list = [];
        esl.getListenerInfoFor(tw.currentNode,{}).forEach(function(value, key, array) {
            if(value.toSource()){
                event_list.push(value);
            }
        });
        if (event_list.length > 0) {
            events.push({'node': tw.currentNode, 'events': event_list});
        }
    } while (tw.nextNode());

    return events;
};
exports.extractEvents = extractEvents;


const dnsLookup = function(domain, callback) {
    let deffered = Q.defer();
    var listener = {
        onLookupComplete: function(inRequest, inRecord, inStatus) {
            deffered.resolve(inRecord);
        },
        QueryInterface: function(aIID) {
            if (aIID.equals(Ci.nsIDNSListener) ||
                aIID.equals(Ci.nsISupports)) {
                return this;
            }
            throw Cr.NS_ERROR_NO_INTERFACE;
        }
    };

    let mainThread = threadManager.currentThread;
    dnsService.asyncResolve(domain, 0, listener, mainThread);

    if (typeof(callback) === "function") {
        deferred.promise.then(callback);
    }

    return deffered.promise;
};
exports.dnsLookup = dnsLookup;


const xhr = {
    Request: function() {
        return xmlhttprequest.createInstance();
    },

    result: function(request) {
        var result = {
            status: request.status,
            statusText: request.statusText,
            headers: {},
            content_type: null,
            data: request.responseText,
            xml: request.responseXML
        };

        var headers = request.getAllResponseHeaders().replace(/^\s+/g, "").replace(/\s+$/, "").split(/\r?\n/);
        var header, name, value;
        for (var i=0; i<headers.length; i++) {
            header = headers[i].split(/:\s+/, 2);
            name = header[0].toLowerCase();
            value = header[1];

            if (result.headers[name] !== undefined) {
                result.headers[name] += "; " + value;
            } else {
                result.headers[name] = value;
            }

            if (name === "content-type") {
                result.contentType = value.split(";")[0];
            }
        }

        return result;
    },

    query: function(url, method, data, headers, partial) {
        method = method || "GET";
        data = data || null;
        headers = headers || {};

        var _headers = {},
            request = this.Request(),
            i;

        if (request === null) {
            throw "No suitable XMLHTTPRequest object found.";
        }

        var result = Q.defer();
        request.open(method, url, true);
        request.onreadystatechange = function() {
            if (partial && request.readyState === 2) {
                request.abort();
                return;
            }
            if (request.readyState === 4) {
                result.resolve(this.result(request));
                return;
            }
        }.bind(this);

        for (i in headers) {
            _headers[i.toLowerCase()] = headers[i];
        }
        headers = _headers;

        if (data && typeof(headers["content-type"]) === "undefined") {
            headers["content-type"] = "application/x-www-form-urlencoded";
        }

        for (i in headers) {
            request.setRequestHeader(i, headers[i]);
        }

        request.send(data);
        return result.promise;
    },

    get: function(url, headers) {
        return this.query(url, "GET", null, headers);
    },

    post: function(url, data, headers) {
        return this.query(url, "POST", data, headers);
    },

    partial: function(url, headers) {
        return this.query(url, "GET", null, headers, true);
    }
};
exports.xhr = xhr;
