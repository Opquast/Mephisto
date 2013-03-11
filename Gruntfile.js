module.exports = function(grunt) {
    "use strict";

    var path = require("path");

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        mephisto: {
            options: {
                path: ["scripts"]
            }
        }
    });

    grunt.registerTask("mephisto", "Launch Mephisto with script", function(script, args) {
        if (!script) {
            grunt.fatal("Usage: grunt mephisto:path-to-script");
        }

        var script = path.join(process.cwd(), script);
        if(!grunt.file.exists(script)) {
            grunt.fatal("Script " + script + " does not exist.");
        }

        var done = this.async();
        var env = process.env;

        env["SHADOW_PATH"] = (this.options().path || []).map(function(v) {
            return path.join(process.cwd(), v);
        }).join(":");

        env["SHADOW_MAIN"] = script;

        if (args) {
            env["SHADOW_ARGS"] = args;
        }

        var ps = grunt.util.spawn({
            cmd: "cfx",
            args: ["run"],
            opts: {
                cwd: "extension",
                env: env
            }
        }, function(error, result, code) {
            done(result.code === 0);
        });

        ps.stdout.on("data", function(data) {
            console.log(data.toString().replace(/\n$/, ""));
        });
        ps.stderr.on("data", function(data) {
            console.error(data.toString().replace(/\n$/, ""));
        });
    });

    grunt.registerTask("runserver", ["mephisto:scripts/server.js:9000"]);
};
