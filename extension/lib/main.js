"use strict";

const shadow = require("shadow/main");

exports.main = function(loadReason, staticArgs) {
    let options = {
        getModuleOverrides: function(modules) {
            modules["base64"] = require("sdk/base64");
            modules["preferences"] = require("sdk/preferences/service");
            modules["promise"] = require("sdk/core/promise");
            modules["test-runner"] = require("opquast-tests/test-runner");
        }
    };

    shadow.main(loadReason, staticArgs, options);
};
