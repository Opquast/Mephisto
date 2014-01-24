"use strict";
const base64 = require("base64");
const {harCollector} = require("har");
const preferences = require("preferences");
const system = require("system");
const testRunner = require("test-runner");
const utils = require("lib/utils");
const webpage = require("webpage");
const webserver = require("webserver");

// Enhance console
require("lib/console").ConsoleLogger();

// This is a server, we should set some preferences to avoid problems
preferences.set("browser.cache.disk.enable", false);
preferences.set("browser.cache.memory.enable", true);
preferences.set("dom.max_script_run_time", 0);
preferences.set("dom.max_chrome_script_run_time", 0);

preferences.set("network.prefetch-next", false);
preferences.set("network.http.pipelining", true);
preferences.set("network.http.http.proxy.pipelining", true);

preferences.set("nglayout.initialpaint.delay", 0);

preferences.set("images.animation_mode", "none");
preferences.set("content.interrupt.parsing", false);
preferences.set("accessibility.blockautorefresh", true);
preferences.set("plugins.click_to_play", true);

preferences.set("browser.chrome.favicons", false);
preferences.set("browser.chrome.site_icons", false);
preferences.set("network.prefetch-next", false);

preferences.set("extensions.sdk.console.logLevel", "all");


console.log("Starting", shadow.extensionName, shadow.extensionVersion, "/", shadow.appName, shadow.appVersion);

const options = {}
system.args.slice(1).forEach(function(v) {
    let parts = v.split("=");
    if (parts.length > 1 && parts[0].indexOf("--") === 0) {
        options[parts[0].substr(2)] = parts.slice(1).join("=");
    }
});

const server = webserver.create();
const serverPort = options.port || 9000;
server.listen(serverPort);

const initPage = function(page, request, response) {
    // Set loggers
    page.on("initialized", function() {
        console.log("INIT", request.get.url);
    });
    page.on("loadStarted", function() {
        console.log("STARTED", request.get.url);
    });
    page.on("loadFinished", function() {
        console.log("LOADED", request.get.url);
    });
    page.on("closing", function() {
        console.log("CLOSED", request.get.url);
    });
    page.on("error", function() {
        console.error(e);
        console.exception(e);
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write("ERROR:" + e);
        response.close();
    });

    page.onConsoleMessage = function() {
        // We don't want page console messages
    };

    // Handle authentication
    if (request.headers["authorization"]) {
        try {
            let auth = base64.decode(request.headers["authorization"].split(" ")[1]).split(":");
            page.settings.userName = auth[0];
            page.settings.password = auth[1];
        } catch(e) {
            console.warn("AUTH ERROR:", e);
        }
    }
};

const assertPage = function(page, result) {
    if (result === "fail") {
        throw new Error('Failed to load page (page status)');
    }

    let body = page.evaluate(function() {
        return document.body;
    });
    if (!body) {
        throw new Error('Failed to load page (no document.body)')
    }
};

const gc = function(page) {
    let win = page.evaluate(function() { return window; });
    shadow.doCC(win);
    shadow.cleanMemory(function(rss) {
        console.info("MINIMIZED MEMORY (" + rss + "MB)");
    });
};

const pageOptions = {
    startTimeout: 15000,
    loadTimeout: 50000,
    loadWait: 1200
};

const collectOptions = {
    captureTypes: [
        /^text\/css/,
        /^(application|text)\/(x-)?javascript/,
    ]
};

/*
Page DOM
*/
server.registerPath("/", function(request, response) {
    console.log(request.method, request.url);

    if (!request.get.url) {
        response.writeHead(400, {"content-type": "text/plain"});
        response.write("No url provided");
        response.close();
        return;
    }

    let page = webpage.create(pageOptions);
    initPage(page, request, response);

    page.open(request.get.url)
    .then(function(result) {
        assertPage(page, result);

        let dom = page.evaluate(function() {
            let x = new XMLSerializer();
            return x.serializeToString(window.document);
        });

        response.headers["Content-Type"] = "text/plain; charset=UTF-8";
        response.write(unescape(encodeURIComponent(dom.toString())));
        response.close();
    })
    .then(gc.bind(null, page))
    .then(null, function(e) {
        console.error(e);
        console.exception(e);
        response.writeHead(500);
        response.headers["content-type"] = "text/plain";
        response.write("ERROR:" + e);
        response.close();
    })
    .then(page.close)
    .then(function() {
        page = null;
    });
});

/*
Page dump
*/
server.registerPath("/dump", function(request, response) {
    console.log(request.method, request.url);

    if (!request.get.url) {
        response.writeHead(400, {"content-type": "text/plain"});
        response.write("No url provided");
        response.close();
        return;
    }

    let testIDs = (request.get.tests || "").split(",").filter(function(v) {
        return v;
    });
    let w = parseInt(request.get.w) || 400;
    let h = parseInt(request.get.h) || 400;

    let content = {};
    let runner;
    let testStart;

    let page = webpage.create(pageOptions);
    let collector = harCollector(page, collectOptions);
    initPage(page, request, response);

    page.open(request.get.url)
    .then(function(result) {
        assertPage(page, result);

        runner = testRunner.create({
            sandbox: page.sandbox.sandbox,
            plainText: page.plainText,
            har: collector.data,
            extractObjects: true,
            timeout: 240000,
            runOptions: {
                debug_validator: false,
                show_errors: false
            }
        });

        // Get resources (async)
        return runner.init().then(function() {
            for (var k in runner.pageInfo) {
                content[k] = runner.pageInfo[k];
            }
            content.resources = runner.resources;
        });
    })
    .then(function() {
        // Getting page DOM serialization
        content.dom = page.evaluate(function() {
            let x = new XMLSerializer();
            return x.serializeToString(window.document);
        });

        // Make screenshot (async)
        return utils.makeScreenshot(page, w, h, true);
    })
    .then(function(render) {
        content.screenshot = render;

        // Run tests (async)
        testStart = new Date();
        console.log("STARTING TESTS", request.get.url);
        return runner.run(testIDs);
    })
    .then(function(results) {
        let testTime = new Date() - testStart;
        response.headers["X-Test-Duration"] = testTime.toString();
        console.log("TESTS DONE (" + testTime + "ms)", request.get.url);
        content.oaa_results = results;
    })
    .then(function() {
        // Results formating
        content.oaa_results = content.oaa_results.map(function(v) {
            v.details = v.details.map(function(d) {
                if (typeof(d.selector) !== "undefined") {
                    delete(d.selector);
                }
                return d;
            });
            return v;
        });
    })
    .then(function() {
        response.headers["Content-Type"] = "application/json; charset=UTF-8";
        // Crazy UTF-8 conversion
        response.write(
            unescape(encodeURIComponent(JSON.stringify(content)))
        );
        response.close();
    })
    .then(gc.bind(null, page))
    .then(null, function(e) {
        console.error(e);
        console.exception(e);
        response.writeHead(500);
        response.headers["content-type"] = "text/plain";
        response.write("ERROR:" + e);
        response.close();
    })
    .then(page.close)
    .then(function() {
        page = null;
        content = null;
        runner = null;
        har = null;
    });
});

/*
Page screenshot
*/
server.registerPath("/screenshot", function(request, response) {
    console.log(request.method, request.url);

    if (!request.get.url) {
        response.writeHead(400, {"content-type": "text/plain"});
        response.write("No url provided");
        response.close();
        return;
    }

    let asB64 = (request.headers["accept-encoding"] || "").split(/\s*,\s*/).indexOf("base64") !== -1;
    let w = parseInt(request.get.w) || undefined;
    let h = parseInt(request.get.h) || undefined;

    let page = webpage.create(pageOptions);
    initPage(page, request, response);

    page.open(request.get.url)
    .then(function(result) {
        assertPage(page, result);
        return utils.makeScreenshot(page, w, h, asB64);
    })
    .then(function(render) {
        response.headers["Content-Type"] = "image/png";
        if (asB64) {
            response.headers["Content-Encoding"] = "base64";
        } else {
            response.setEncoding("binary");
        }
        response.write(render);
        response.close();
    })
    .then(gc.bind(null, page))
    .then(null, function(e) {
        console.error(e);
        console.exception(e);
        response.writeHead(500);
        response.headers["content-type"] = "text/plain";
        response.write("ERROR:" + e);
        response.close();
    })
    .then(page.close)
    .then(function() {
        page = null;
    });
});


/*
Server Status
*/
server.registerPath("/status", function(request, response) {
    console.log(request.method, request.url);

    var format = "txt";

    if (request.headers.accept && request.headers.accept.search("application/json") != -1) {
        format = "json";
    }

    function objectToTxt(obj, prefix) {
        // Simple object to plain/text converter.
        prefix = prefix || "";
        var res = "";
        for (var i in obj) {
            if (typeof(obj[i]) == "object") {
                res += objectToTxt(obj[i], i + "_");
            } else {
                res += prefix + i + ":\t" + obj[i] + "\n";
            }
        }

        return res;
    };

    function writeReport() {
        var report = shadow.statusReport();
        if (format == "json") {
            response.headers["Content-Type"] = "application/json; charset=UTF-8";
            response.write(JSON.stringify(shadow.statusReport()));
        } else {
            response.headers["Content-Type"] = "text/plain; charset=UTF-8";
            response.write(objectToTxt(report));
        }
        response.close();
    }

    if (request.get.clean) {
        shadow.cleanMemory(function(rss) {
            console.info("MINIMIZED MEMORY (" + rss + "MB)");
            writeReport();
        })
    } else {
        writeReport();
    }
});


console.log("Server running on ", server.host + ":" + server.port, "...");

if (options.autoupdate) {
    require("request").Request({
        url: options.autoupdate,
        headers: {
            "Accept": "application/json"
        },
        contentType: "application/json",
        content: JSON.stringify(testRunner.getRules().rulesets),
        onComplete: function(response) {
            if (response.status === 200) {
                console.log("Auto:", response.json.full, "Semi-auto:", response.json.semi);
            } else {
                console.error("Auto update failed (" + response.status + ")");
                console.error(response.text);
            }
        }
    }).post();
    console.log("Push criterion updates to", options.autoupdate);
}
