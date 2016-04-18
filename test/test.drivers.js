/* global beforeEach:true, describe:true, expect:true, it:true */
describe('Driver API', function() {
    'use strict';

    beforeEach(function(done) {
        if (papergirl.supports(papergirl.INDEXEDDB)) {
            papergirl.setDriver(papergirl.INDEXEDDB, function() {
                done();
            });
        } else if (papergirl.supports(papergirl.WEBSQL)) {
            papergirl.setDriver(papergirl.WEBSQL, function() {
                done();
            });
        } else {
            done();
        }
    });

    if ((papergirl.supports(papergirl.INDEXEDDB) &&
         papergirl.driver() === papergirl.INDEXEDDB) ||
        (papergirl.supports(papergirl.WEBSQL) &&
         papergirl.driver() === papergirl.WEBSQL)) {
        it('can change to localStorage from ' + papergirl.driver() +
           ' [callback]', function(done) {
            var previousDriver = papergirl.driver();

            papergirl.setDriver(papergirl.LOCALSTORAGE, function() {
                expect(papergirl.driver()).to.be(papergirl.LOCALSTORAGE);
                expect(papergirl.driver()).to.not.be(previousDriver);
                done();
            });
        });
        it('can change to localStorage from ' + papergirl.driver() +
           ' [promise]', function(done) {
            var previousDriver = papergirl.driver();

            papergirl.setDriver(papergirl.LOCALSTORAGE).then(function() {
                expect(papergirl.driver()).to.be(papergirl.LOCALSTORAGE);
                expect(papergirl.driver()).to.not.be(previousDriver);
                done();
            });
        });
    }

    if (!papergirl.supports(papergirl.INDEXEDDB)) {
        it("can't use unsupported IndexedDB [callback]", function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.not.be(papergirl.INDEXEDDB);

            // These should be rejected in component builds but aren't.
            // TODO: Look into why.
            papergirl.setDriver(papergirl.INDEXEDDB, null, function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
        it("can't use unsupported IndexedDB [promise]", function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.not.be(papergirl.INDEXEDDB);

            // These should be rejected in component builds but aren't.
            // TODO: Look into why.
            papergirl.setDriver(papergirl.INDEXEDDB).then(null,
                                                              function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
    } else {
        it('can set already active IndexedDB [callback]', function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.be(papergirl.INDEXEDDB);

            papergirl.setDriver(papergirl.INDEXEDDB, function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
        it('can set already active IndexedDB [promise]', function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.be(papergirl.INDEXEDDB);

            papergirl.setDriver(papergirl.INDEXEDDB).then(function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
    }

    if (!papergirl.supports(papergirl.LOCALSTORAGE)) {
        it("can't use unsupported localStorage [callback]", function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.not.be(papergirl.LOCALSTORAGE);

            papergirl.setDriver(papergirl.LOCALSTORAGE, null, function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
        it("can't use unsupported localStorage [promise]", function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.not.be(papergirl.LOCALSTORAGE);

            papergirl.setDriver(papergirl.LOCALSTORAGE).then(null,
                                                              function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
    } else if (!papergirl.supports(papergirl.INDEXEDDB) &&
               !papergirl.supports(papergirl.WEBSQL)) {
        it('can set already active localStorage [callback]', function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.be(papergirl.LOCALSTORAGE);

            papergirl.setDriver(papergirl.LOCALSTORAGE, function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
        it('can set already active localStorage [promise]', function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.be(papergirl.LOCALSTORAGE);

            papergirl.setDriver(papergirl.LOCALSTORAGE).then(function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
    }

    if (!papergirl.supports(papergirl.WEBSQL)) {
        it("can't use unsupported WebSQL [callback]", function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.not.be(papergirl.WEBSQL);

            papergirl.setDriver(papergirl.WEBSQL, null, function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
        it("can't use unsupported WebSQL [promise]", function(done) {
            var previousDriver = papergirl.driver();
            expect(previousDriver).to.not.be(papergirl.WEBSQL);

            papergirl.setDriver(papergirl.WEBSQL).then(null,
                                                              function() {
                expect(papergirl.driver()).to.be(previousDriver);
                done();
            });
        });
    } else {
        it('can set already active WebSQL [callback]', function(done) {
            papergirl.setDriver(papergirl.WEBSQL, function() {
                var previousDriver = papergirl.driver();
                expect(previousDriver).to.be(papergirl.WEBSQL);

                papergirl.setDriver(papergirl.WEBSQL, function() {
                    expect(papergirl.driver()).to.be(previousDriver);
                    done();
                });
            });
        });
        it('can set already active WebSQL [promise]', function(done) {
            papergirl.setDriver(papergirl.WEBSQL).then(function() {
                var previousDriver = papergirl.driver();
                expect(previousDriver).to.be(papergirl.WEBSQL);

                papergirl.setDriver(papergirl.WEBSQL).then(function() {
                    expect(papergirl.driver()).to.be(previousDriver);
                    done();
                });
            });
        });
    }
});
