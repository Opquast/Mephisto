const {extend} = require("utils");
const main = require("main");
const preferences = require("preferences-service");
const test_server = require("./httpd-tests");

// Starting main program
server = main.main();

// Adding tests handler
test_server.register_test_dir(server, '/tests/', 'tests');

const server_host = preferences.get('extensions.mephisto.serverHost');
const server_port = preferences.get('extensions.mephisto.serverPort');

function serverGet(options) {
    if (options.url == undefined) {
        options.url = "http://" + server_host + ":" + server_port + '/';
    }
    require("request").Request(options).get();
}

function serverGetTest(path, options) {
    options.url = "http://" + server_host + ":" + server_port + "/dump";
    options.content = options.content || {};
    
    extend(options.content, {
        'url': "http://" + server_host + ":" + server_port + "/tests/" + path
    })
    serverGet(options);
}

exports.test_serve = function(test) {
    serverGet({
        content: {
            url: 'http://google.com/'
        },
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.assertEqual(response.headers['Content-Type'].search(/^text\/plain/), 0);
            test.done();
        }
    });
    test.waitUntilDone(20000);
};

exports.test_base = function(test) {
    serverGetTest('index.html', {
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.assertEqual(response.json.resources.length, 1);
            test.done();
        }
    });
    test.waitUntilDone(20000);
};

exports.test_window = function(test) {
    serverGetTest('window-features.html', {
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.done();
        }
    });
    test.waitUntilDone(20000);
};

exports.test_modifiers = function(test) {
    serverGetTest('index.html', {
        content: {
            'modifier': ['jquery-1.5.min.js', 'extractor.js']
        },
        onComplete: function(response) {
            test.assertEqual(response.status, 200);
            test.assertEqual(response.json.links.length, 1);
            test.done();
        }
    });
    test.waitUntilDone(20000);
};

exports.test_monitor = function(test) {
    require("request").Request({
        headers: {"Accept": "application/json"},
        url: "http://" + server_host + ":" + server_port + "/monitor",
        onComplete: function(response) {
            test.assertEqual(response.headers['Content-Type'].search(/^application\/json/), 0);
            test.assertEqual(response.json.tab_count, 1);
            test.done();
        }
    }).get();
    test.waitUntilDone(20000);
};