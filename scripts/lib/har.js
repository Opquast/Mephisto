"use strict";

exports.init = function(page) {
    var startTime, readyTime, loadTime,
        resources = {};

    var result = {
        "version": "1.2",
        "creator": {
            "name": shadow.extensionName,
            "version": shadow.extensionVersion.toString()
        },
        "browser": {
            "name": shadow.appName,
            "version": shadow.appVersion.toString()
        },
        "pages": [],
        "entries": []
    };

    page.on("loadStarted", function() {
        startTime = new Date();
        result.pages.push({
            "startedDateTime": startTime.toISOString(),
            "id": page.url,
            "title": "",
            "pageTimings": {
                "onContentLoad": -1,
                "onLoad": -1
            }
        });
    });
    page.on("loadContent", function() {
        readyTime = new Date();
    });
    page.on("loadFinished" , function() {
        loadTime = new Date();
    });
    page.on("openFinished", function(res) {
        if (res != "success") {
            return;
        }

        result.pages[0].pageTimings.onContentLoad = readyTime - startTime;
        result.pages[0].pageTimings.onLoad = loadTime - startTime;
        result.pages[0].title = page.evaluate(function() {
            return document.title || "";
        });

        Object.keys(resources).forEach(function(k) {
            let r = resources[k];
            if (!r.response.start || !r.response.end) {
                return;
            }

            let mimeType = "";
            r.response.end.headers.forEach(function(val) {
                if (val.name.toLowerCase() == "content-type") {
                    mimeType = val.value;
                }
            });

            result.entries.push({
                "_url": r.response.end.url,
                "pageref": page.url,
                "startedDateTime": r.request.time.toISOString(),
                "time": r.response.end.time - r.request.time,
                "request": {
                    "method": r.request.method,
                    "url": r.request.url,
                    "httpVersion": "HTTP/1.1",
                    "cookies": [],
                    "headers": r.request.headers,
                    "queryString" : [],
                    "postData" : {},
                    "headersSize" : -1,
                    "bodySize" : -1
                },
                "response": {
                    "status": r.response.end.status,
                    "statusText": r.response.end.statusText,
                    "httpVersion": "HTTP/1.1",
                    "cookies": [],
                    "headers": r.response.end.headers,
                    "content": {
                        "size": r.response.end.bodySize,
                        "compression": 0,
                        "mimeType": mimeType,
                        "text": r.response.end.body
                    },
                    "redirectURL": r.response.end.redirectURL || "",
                    "headersSize" : -1,
                    "bodySize" : r.response.end.bodySize,
                    "_contentType": r.response.end.contentType,
                    "_contentCharset": r.response.end.contentCharset,
                    "_referrer": r.response.end.referrer,
                    "_imageInfo": r.response.end.imageInfo || null
                },
                "cache": {},
                "timings": {
                    "send": 0,
                    "wait": r.response.start.time - r.request.time,
                    "receive": r.response.end.time - r.response.start.time
                }
            });
        });
    });

    page.on("resourceRequested", function(request) {
        resources[request.id] = {
            request: request,
            response: {"start": null, "end": null}
        };
    });

    page.on("resourceReceived", function(response) {
        resources[response.id].response[response.stage] = response;
    });

    return result;
};
