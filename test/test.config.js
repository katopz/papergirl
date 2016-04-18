/* global before:true, beforeEach:true, describe:true, expect:true, it:true */
describe('Config API', function() {
    'use strict';

    var DRIVERS = [
        papergirl.INDEXEDDB,
        papergirl.LOCALSTORAGE,
        papergirl.WEBSQL
    ];
    var supportedDrivers = [];

    before(function() {
        this.defaultConfig = papergirl.config();

        supportedDrivers = [];
        for (var i = 0; i <= DRIVERS.length; i++) {
            if (papergirl.supports(DRIVERS[i])) {
                supportedDrivers.push(DRIVERS[i]);
            }
        }
    });

    // Reset papergirl before each test so we can call `config()` without
    // errors.
    beforeEach(function() {
        papergirl._ready = null;
        papergirl.config(this.defaultConfig);
    });

    it('returns the default values', function(done) {
        expect(papergirl.config('description')).to.be('');
        expect(papergirl.config('name')).to.be('papergirl');
        expect(papergirl.config('size')).to.be(4980736);
        expect(papergirl.config('storeName')).to.be('keyvaluepairs');
        expect(papergirl.config('version')).to.be(1.0);
        papergirl.ready(function() {
            expect(papergirl.config('driver')).to.be(papergirl.driver());
            done();
        });
    });

    it('returns error if API call was already made', function(done) {
        papergirl.length(function() {
            var configResult = papergirl.config({
                description: '123',
                driver: 'I a not set driver',
                name: 'My Cool App',
                storeName: 'myStoreName',
                version: 2.0
            });

            var error = "Error: Can't call config() after papergirl " +
                        'has been used.';

            expect(configResult).to.not.be(true);
            expect(configResult.toString()).to.be(error);

            // Expect the config values to be as they were before.
            expect(papergirl.config('description')).to.not.be('123');
            expect(papergirl.config('description')).to.be('');
            expect(papergirl.config('driver')).to.be(papergirl.driver());
            expect(papergirl.config('driver')).to.not
                              .be('I a not set driver');
            expect(papergirl.config('name')).to.be('papergirl');
            expect(papergirl.config('name')).to.not.be('My Cool App');
            expect(papergirl.config('size')).to.be(4980736);
            expect(papergirl.config('storeName')).to.be('keyvaluepairs');
            expect(papergirl.config('version')).to.be(1.0);

            done();
        });
    });

    it('sets new values and returns them properly', function(done) {
        var secondSupportedDriver = supportedDrivers.length >= 2 ? supportedDrivers[1] : null;

        papergirl.config({
            description: 'The offline datastore for my cool app',
            driver: secondSupportedDriver,
            name: 'My Cool App',
            storeName: 'myStoreName',
            version: 2.0
        });

        expect(papergirl.config('description')).to.not.be('');
        expect(papergirl.config('description')).to
                          .be('The offline datastore for my cool app');
        expect(papergirl.config('driver')).to
                          .be(secondSupportedDriver);
        expect(papergirl.config('name')).to.be('My Cool App');
        expect(papergirl.config('size')).to.be(4980736);
        expect(papergirl.config('storeName')).to.be('myStoreName');
        expect(papergirl.config('version')).to.be(2.0);

        papergirl.ready(function() {
            if (supportedDrivers.length >= 2) {
                expect(papergirl.config('driver')).to
                                  .be(secondSupportedDriver);
            } else {
                expect(papergirl.config('driver')).to
                                  .be(supportedDrivers[0]);
            }
            done();
        });
    });

    if (supportedDrivers.length >= 2) {
        it('sets new driver using preference order', function(done) {
            var otherSupportedDrivers = supportedDrivers.slice(1);

            papergirl.config({
                driver: otherSupportedDrivers
            });

            papergirl.ready(function() {
                expect(papergirl.config('driver')).to
                                  .be(otherSupportedDrivers[0]);
                done();
            });
        });
    }

    it('it does not set an unsupported driver', function(done) {
        var oldDriver = papergirl.driver();
        papergirl.config({
            driver: 'I am a not supported driver'
        });

        papergirl.ready(function() {
            expect(papergirl.config('driver')).to
                              .be(oldDriver);
            done();
        });
    });

    it('it does not set an unsupported driver using preference order', function(done) {
        var oldDriver = papergirl.driver();
        papergirl.config({
            driver: [
                'I am a not supported driver',
                'I am a an other not supported driver'
            ]
        });

        papergirl.ready(function() {
            expect(papergirl.config('driver')).to
                              .be(oldDriver);
            done();
        });
    });

    it('converts bad config values across drivers', function() {
        papergirl.config({
            name: 'My Cool App',
            // https://github.com/mozilla/localForage/issues/247
            storeName: 'my store&name-v1',
            version: 2.0
        });

        expect(papergirl.config('name')).to.be('My Cool App');
        expect(papergirl.config('storeName')).to.be('my_store_name_v1');
        expect(papergirl.config('version')).to.be(2.0);
    });

    it('uses the config values in ' + papergirl.driver(), function(done) {
        papergirl.config({
            description: 'The offline datastore for my cool app',
            driver: papergirl.driver(),
            name: 'My Cool App',
            storeName: 'myStoreName',
            version: 2.0
        });

        papergirl.setItem('some key', 'some value').then(function(value) {
            if (papergirl.driver() === papergirl.INDEXEDDB) {
                var indexedDB = (indexedDB || window.indexedDB ||
                                 window.webkitIndexedDB ||
                                 window.mozIndexedDB || window.OIndexedDB ||
                                 window.msIndexedDB);
                var req = indexedDB.open('My Cool App', 2.0);

                req.onsuccess = function() {
                    var dbValue = req.result
                                     .transaction('myStoreName', 'readonly')
                                     .objectStore('myStoreName')
                                     .get('some key');
                    expect(dbValue).to.be(value);
                    done();
                };
            } else if (papergirl.driver() === papergirl.WEBSQL) {
                window.openDatabase('My Cool App', String(2.0), '',
                                    4980736).transaction(function(t) {
                    t.executeSql('SELECT * FROM myStoreName WHERE key = ? ' +
                                 'LIMIT 1', ['some key'],
                                 function(t, results) {
                        var dbValue = JSON.parse(results.rows.item(0).value);

                        expect(dbValue).to.be(value);
                        done();
                    });
                });
            } else if (papergirl.driver() === papergirl.LOCALSTORAGE) {
                var dbValue = JSON.parse(
                  localStorage['My Cool App/myStoreName/some key']);

                expect(dbValue).to.be(value);
                done();
            }
        });
    });

    it("returns all values when config isn't passed arguments", function() {
        expect(papergirl.config()).to.be.an('object');
        expect(Object.keys(papergirl.config()).length).to.be(6);
    });

    // This may go away when https://github.com/mozilla/localForage/issues/168
    // is fixed.
    it('maintains config values across setDriver calls', function(done) {
        papergirl.config({
            name: 'Mega Mozilla Dino'
        });

        papergirl.length().then(function() {
            return papergirl.setDriver(papergirl.LOCALSTORAGE);
        }).then(function() {
            expect(papergirl.config('name')).to.be('Mega Mozilla Dino');
            done();
        });
    });
});
