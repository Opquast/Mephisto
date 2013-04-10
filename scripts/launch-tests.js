"use strict";
const system = require("system");
const webpage = require("webpage");

const testRunner = require("test-runner");
const {harCollector} = require("har");

let url = system.args[1] || null;
if (!url) {
    console.error("Error: No URL given");
    shadow.exit(1);
}

let pageOptions = {
    startTimeout: 15000,
    loadTimeout: 50000,
    loadWait: 1200
};

let collectOptions = {
    captureTypes: [
        /^text\/css/,
        /^(application|text)\/(x-)?javascript/
    ]
};

const run = function(page, url, runOptions, testIDs) {
    let collector = harCollector(page, collectOptions);
    let runner;

    return page.open(url)
    .then(function(result) {
        if (result !== "success") {
            throw new Error("Page not loaded");
        }

        runner = testRunner.create({
            sandbox: page.sandbox.sandbox,
            plainText: page.plainText,
            har: collector.data,
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

let p = webpage.create(pageOptions);

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
