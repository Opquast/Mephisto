"use strict";

const shadow = require("shadow/main");

exports.main = function(loadReason, staticArgs) {
    let options = {
        getModuleOverrides: function(modules) {
            modules["extras"] = require("./extras");
        }
    };

    shadow.main(loadReason, staticArgs, options);
};
