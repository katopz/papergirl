/* global before:true, beforeEach:true, describe:true, expect:true, it:true, Modernizr:true */
var DRIVERS = [
    papergirl.storage.INDEXEDDB,
    papergirl.storage.LOCALSTORAGE,
    papergirl.storage.WEBSQL
];

DRIVERS.forEach(function(driverName) {
    if ((!papergirl.storage.supports(papergirl.storage.INDEXEDDB) &&
         driverName === papergirl.storage.INDEXEDDB) ||
        (!papergirl.storage.supports(papergirl.storage.LOCALSTORAGE) &&
         driverName === papergirl.storage.LOCALSTORAGE) ||
        (!papergirl.storage.supports(papergirl.storage.WEBSQL) &&
         driverName === papergirl.storage.WEBSQL)) {
        // Browser doesn't support this storage library, so we exit the API
        // tests.
        return;
    }

    describe('Web Worker support in ' + driverName, function() {
        'use strict';

        before(function(done) {
            papergirl.storage.setDriver(driverName).then(done);
        });

        beforeEach(function(done) {
            papergirl.storage.clear(done);
        });

        if (!Modernizr.webworkers) {
            it.skip('doesn\'t have web worker support');
            return;
        }

        if (driverName === papergirl.storage.LOCALSTORAGE ||
            driverName === papergirl.storage.WEBSQL) {
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
