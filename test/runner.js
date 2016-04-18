// Run before window.onload to make sure the specs have access to describe()
// and other mocha methods. All feels very hacky though :-/
this.mocha.setup('bdd');

function runTests() {
    var runner = this.mocha.run();

    var failedTests = [];

    runner.on('end', function(){
        window.mochaResults = runner.stats;
        window.mochaResults.reports = failedTests;
    });

    function flattenTitles(test) {
        var titles = [];

        while (test.parent.title) {
            titles.push(test.parent.title);
            test = test.parent;
        }

        return titles.reverse();
    }

    function logFailure(test, err) {
        failedTests.push({
            name: test.title,
            result: false,
            message: err.message,
            stack: err.stack,
            titles: flattenTitles(test)
        });
    }

    runner.on('fail', logFailure);
}

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(callback, thisArg) {
        if (typeof(callback) !== "function") {
            throw new TypeError(callback + " is not a function!");
        }
        var len = this.length;
        for (var i = 0; i < len; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

var require = this.require;
if (require) {
    if (this.requireUnbundledPapergirl) {
        requirejs.config({
            paths: {
                papergirl: '/build/es5src/papergirl',
                papergirlSerializer: '/build/es5src/utils/serializer',
                asyncStorage: '/build/es5src/drivers/indexeddb',
                localStorageWrapper: '/build/es5src/drivers/localstorage',
                webSQLStorage: '/build/es5src/drivers/websql',
                Promise: '/bower_components/es6-promise/promise',
                localforage: '/build/es5src/localforage'
            },
            shim: {
                papergirl: ['Promise']
            }
        });
    } else {
        requirejs.config({
            paths: {
                papergirl: '/dist/papergirl'
            }
        });
    }
    require(['papergirl'], function(papergirl) {
        window.papergirl = papergirl;

        require([
            '/test/test.api.js'
        ], runTests);
    });
} else if (this.addEventListener) {
    this.addEventListener('load', runTests);
} else if (this.attachEvent) {
    this.attachEvent('onload', runTests);
}
