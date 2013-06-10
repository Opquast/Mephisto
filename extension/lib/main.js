"use strict";

const shadow = require("shadow/main");
const {prefs} = require("sdk/simple-prefs");

exports.main = function(loadReason, staticArgs) {
    prefs['sdk.console.logLevel'] = "debug";
    let options = {
        getModuleOverrides: function(modules) {
            modules["base64"] = require("sdk/base64");
            modules["preferences"] = require("sdk/preferences/service");
            modules["promise"] = require("sdk/core/promise");
            modules["request"] = require("sdk/request");
            modules["test-runner"] = require("opquast-tests/test-runner");
        }
    };

    shadow.main(loadReason, staticArgs, options);
};
