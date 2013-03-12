"use strict";
const system = require("system");
const webpage = require("webpage");

const testRunner = require("test-runner");
const harLib = require("lib/har");

let url = system.args[1] || null;
if (!url) {
    console.error("Error: No URL given");
    shadow.exit(1);
}

const run = function(page, url, runOptions, testIDs) {
    let har = harLib.init(page);
    let runner;

    return page.open(url)
    .then(function(result) {
        if (result !== "success") {
            throw new Error("Page not loaded");
        }

        runner = testRunner.create({
            sandbox: page.sandbox.sandbox,
            plainText: page.plainText,
            har: har,
            extractObjects: true,
            runOptions: runOptions
        });
        return runner.run(testIDs);
    })
    .then(function(results) {
        // Uncomment if you want to dump results
        //return results;

        var res = {"c": 0, "nc": 0, "i": 0, "na": 0};
        results.forEach(function(r) {
            res[r.result] += 1;
        });

        return res;
    });
};

let p = webpage.create({
    startTimeout: 10000,
    loadTimeout: 30000,
    loadWait: 1000,
    captureTypes: [
        /^text\/css/,
        /^(application|text)\/(x-)?javascript/,
    ]
});

run(p, url, {
    debug_validator: false,
    show_errors: false,
    timing_validator: false
})
.then(function() {
    let args = [].slice.call(arguments);
    console.log(JSON.stringify(args, null, 2))
})
.then(null, function(e) {
    console.log("== ERROR ==");
    console.exception(e);
})
.then(p.close)
.then(shadow.exit);
