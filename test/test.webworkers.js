/* global before:true, beforeEach:true, describe:true, expect:true, it:true, Modernizr:true */
var DRIVERS = [
    papergirl.INDEXEDDB,
    papergirl.LOCALSTORAGE,
    papergirl.WEBSQL
];

DRIVERS.forEach(function(driverName) {
    if ((!papergirl.supports(papergirl.INDEXEDDB) &&
         driverName === papergirl.INDEXEDDB) ||
        (!papergirl.supports(papergirl.LOCALSTORAGE) &&
         driverName === papergirl.LOCALSTORAGE) ||
        (!papergirl.supports(papergirl.WEBSQL) &&
         driverName === papergirl.WEBSQL)) {
        // Browser doesn't support this storage library, so we exit the API
        // tests.
        return;
    }

    describe('Web Worker support in ' + driverName, function() {
        'use strict';

        before(function(done) {
            papergirl.setDriver(driverName).then(done);
        });

        beforeEach(function(done) {
            papergirl.clear(done);
        });

        if (!Modernizr.webworkers) {
            it.skip('doesn\'t have web worker support');
            return;
        }

        if (driverName === papergirl.LOCALSTORAGE ||
            driverName === papergirl.WEBSQL) {
            it.skip(driverName + ' is not supported in web workers');
            return;
        }

        it('saves data', function(done) {
            var webWorker = new Worker('/test/webworker-client.js');

            webWorker.addEventListener('message', function(e) {
                var body = e.data.body;

                window.console.log(body);
                expect(body).to.be('I have been set');
                done();
            });

            webWorker.addEventListener('error', function(e) {
                window.console.log(e);
            });

            webWorker.postMessage({
                driver: driverName,
                value: 'I have been set'
            });
        });
    });
});
