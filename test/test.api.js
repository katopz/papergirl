/* global describe:true, expect:true, it:true, Promise:true, require:true, beforeEach:true, assert:true */
var componentBuild = window.require && window.require.modules &&
    window.require.modules.papergirl &&
    window.require.modules.papergirl.component;

describe('Papergirl API', function() {
    // If this test is failing, you are likely missing the Promises polyfill,
    // installed via bower. Read more here:
    // https://github.com/mozilla/localForage#working-on-localforage
    it('has Promises available', function() {
        if (componentBuild) {
            expect(require('promise')).to.be.a('function');
        } else {
            expect(Promise).to.be.a('function');
        }
    });
});

describe('Papergirl', function() {

    var FOO_URL = '/test/foo.json';
    var FOO_DATA = '{ "foo": "HelloWorld" }';

    //var BAR_URL = '/test/bar.json';
    //var BAR_DATA = '{ "bar": "HelloWorld" }';

    beforeEach(function(done) {
        papergirl.clear().then(done);
    });

    // Methods inherit from localforage -----------------------------------------------------------------------------------------------

    it('can set item via localForage [promise]', function(done) {
        papergirl.setData(FOO_URL, FOO_DATA).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
            done();
        });
    });

    it('can get existng item via localForage [promise]', function(done) {
        papergirl.setData(FOO_URL, FOO_DATA).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
            papergirl.getData(FOO_URL).then(function(data) {
                assert(expect(data).to.be(FOO_DATA));
                done();
            });
        });
    });

    it('can remove existng item via localForage [promise]', function(done) {
        papergirl.setData(FOO_URL, FOO_DATA).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
            papergirl.getData(FOO_URL).then(function(data) {
                assert(expect(data).to.be(FOO_DATA));
                papergirl.removeData(FOO_URL).then(function(data) {
                    assert(expect(data).to.not.be.ok);
                    done();
                });
            });
        });
    });

    // Private Methods -----------------------------------------------------------------------------------------------

    it('can request a response from remote [promise]', function(done) {
        papergirl.getCacheFirst(FOO_URL).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
            done();
        });
    });

    it('can get cached response from localForage after cached [promise]', function(done) {
        papergirl.getCacheFirst(FOO_URL).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
            papergirl.getData(FOO_URL).then(function(data) {
                assert(expect(data).to.be(FOO_DATA));
                done();
            });
        });
    });

    it('can remove cached response from localForage after cached [promise]', function(done) {
        papergirl.getCacheFirst(FOO_URL).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
            papergirl.getData(FOO_URL).then(function(data) {
                assert(expect(data).to.be(FOO_DATA));
                papergirl.removeData(FOO_URL).then(function(data) {
                    assert(expect(data).to.not.be.ok);
                    done();
                });
            });
        });
    });

    it('will get `insert` call when no cached data [promise]', function(done) {

        var insert = function(data) {
            assert(expect(data).to.be(FOO_DATA));
            done();
        };

        papergirl.removeData(FOO_URL).then(function(data) {
            assert(expect(data).to.not.be.ok);
            papergirl.request(FOO_URL, {
                'strategy': papergirl.cacheFirst,
                'insert': insert
            }).then(function(data) {
                assert(expect(data).to.be(FOO_DATA));
            });
        });
    });

    it('won\'t get `update` call when use cached data [promise]', function(done) {

        var update = function(data) {
            assert(expect(data).to.not.be.ok);
            throw new Error('This shouldn\'t be call');
        };

        papergirl.setData(FOO_URL, FOO_DATA).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
            papergirl.request(FOO_URL, {
                'strategy': papergirl.cacheFirst,
                'update': update
            }).then(function(data) {
                assert(expect(data).to.be(FOO_DATA));
                done();
            });
        });
    });

    it('will get `upsert` call when no cached data [promise]', function(done) {

        var upsert = function(data) {
            assert(expect(data).to.be(FOO_DATA));
            done();
        };

        papergirl.removeData(FOO_URL).then(function(data) {
            assert(expect(data).to.not.be.ok);
            papergirl.request(FOO_URL, {
                'strategy': papergirl.cacheFirst,
                'upsert': upsert
            }).then(function(data) {
                assert(expect(data).to.be(FOO_DATA));
            });
        });
    });

    it('will get `upsert` call when use cached data [promise]', function(done) {

        var upsert = function(data) {
            assert(expect(data).to.be(FOO_DATA));
            done();
        };

        papergirl.setData(FOO_URL, FOO_DATA).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
            papergirl.request(FOO_URL, {
                'strategy': papergirl.cacheFirst,
                'upsert': upsert
            }).then(function(data) {
                assert(expect(data).to.be(FOO_DATA));
            });
        });
    });

    it('can get `etag` if has [promise]', function(done) {
        // etag will set after local events fire.
        var upsert = function(data, url, options) {
            assert(expect(data).to.be(FOO_DATA));
            papergirl.getETAG(url).then(function(etag) {
                assert(expect(etag).to.be(options.etag));
                done();
            });
        };

        // Retain etag
        var options = {
            'strategy': papergirl.cacheFirst,
            'upsert': upsert
        };

        papergirl.request(FOO_URL, options).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
        });
    });

    /* Test failed via phantomjs but working via real browser
    it('will get `not_mod` call when use etag and cached data [promise]', function(done) {
        var not_mod = function(data) {
            if (url === FOO_URL) {
                assert(expect(data).to.be(FOO_DATA));
                done();
            }
        };
        
        papergirl.request(FOO_URL).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));
            
            papergirl.request(FOO_URL, {
                'not_mod': not_mod
            }).then(function(data) {
                assert(expect(data).to.be(FOO_DATA));
            });
        });
    });
    */

    // Public Methods -----------------------------------------------------------------------------------------------

    it('can request from cache first and update later when use cached [callback]', function(done) {
        var isLoadFromCache = false;
        papergirl.setData(FOO_URL, FOO_DATA).then(function(data) {
            assert(expect(data).to.be(FOO_DATA));

            papergirl.getCacheFirst(FOO_URL, function(data) {
                // Cache is faster so this will call first.
                assert(expect(data).to.be(FOO_DATA));
                isLoadFromCache = true;
            }).then(function(data) {
                // And then we got update from remote.
                assert(expect(data).to.be(FOO_DATA));
                expect(isLoadFromCache).to.be(true);
                done();
            });
        });
    });

    // -TOTEST-
    // cacheOnly
    // networkOnly
    // catch
    // remote
    // xhr.responseTextType = 'json'
    // multi store
    // ready
    // ignore query when cache
    // offlineFirst
    // onload
    // max-age
});
