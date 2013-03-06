"use strict";
const Q = require("promise");

exports.makeScreenshot = function(page, w, h, base64) {
    base64 = typeof(base64) === "boolean" && base64 || false;
    let width = 1024;
    let height = 700;

    w = parseInt(w) || width;
    h = parseInt(h) || height;

    let ratio = w/width;

    page.clipRect = {
        top: 0,
        left: 0,
        width: width,
        height: h / ratio
    };

    return page.foreground().then(function() {
        let deferred = Q.defer();

        setTimeout(function() {
            let render = base64 && page.renderBase64("png", ratio) || page.renderBytes("png", ratio);
            deferred.resolve(render);
        },500);

        return deferred.promise;
    });
};
