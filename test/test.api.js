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

    var mock = {};
    mock.FOO_URL = '/test/foo.json';
    mock.FOO_DATA = '{ "foo": "HelloWorld" }';

    mock.BAR_URL = '/test/bar.json';
    mock.BAR_DATA = '{ "bar": "HelloWorld" }';

    beforeEach(function(done) {
        papergirl.clear().then(done);
    });

    // Public Methods -----------------------------------------------------------------------------------------------

    it('can detect localhost origin and fallback to local uri if provide [callback]', function(done) {
        papergirl.watch()
            .onUpsert(function(data) {
                // And then we got update from localhost.
                assert(expect(data).to.be(mock.BAR_DATA));
                // Do update view with new data.
                done();
            })
            .local(mock.BAR_URL)
            .request(mock.FOO_URL);
    });

    it('can get sync event when remote and cached method is completed [callback]', function(done) {
        papergirl.watch().onSync(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            done();
        }).request(mock.FOO_URL);
    });

    it('can use cached data first and remote later if content is different from cached [callback]', function(done) {
        var isLoadFromCache = false;

        // Simulated old content as BAR
        papergirl.setData(mock.FOO_URL, mock.BAR_DATA).then(function(data) {
            assert(expect(data).to.be(mock.BAR_DATA));

            papergirl.watch()
                .onCache(function(data) {
                    // Cache is faster so this will call first if has.
                    assert(expect(data).to.be(mock.BAR_DATA));
                    // Do serve data to view and wait for remote. 
                    isLoadFromCache = true;
                })
                .onUpsert(function(data) {
                    // And then we got insert or update from remote.
                    assert(expect(data).to.be(mock.FOO_DATA));
                    // Also cache shoud triggered.
                    expect(isLoadFromCache).to.be(true);
                    // Do update view with new data.
                    done();
                })
                .onError(function(error) {
                    // This should not be call.
                    throw new Error('This shouldn\'t be call : ' + error);
                })
                .request(mock.FOO_URL);
        });
    });

    it('can watch for upsert event from remote if content is different from cached [callback]', function(done) {
        // Simulated old content as BAR
        papergirl.setData(mock.FOO_URL, mock.BAR_DATA).then(function(data) {
            assert(expect(data).to.be(mock.BAR_DATA));

            // Watch for remote update.
            papergirl.watch().onUpsert(function(data) {
                // And then we got insert or update from remote.
                assert(expect(data).to.be(mock.FOO_DATA));
                // Do update view with new data.
                done();
            }).request(mock.FOO_URL);
        });
    });

    it('can use cached data. [callback]', function(done) {
        // Simulated old content as BAR
        papergirl.setData(mock.FOO_URL, mock.BAR_DATA).then(function(data) {
            assert(expect(data).to.be(mock.BAR_DATA));

            // Watch for cache exist.
            papergirl.watch().onCache(function(data) {
                // Cache is faster so this will call first.
                assert(expect(data).to.be(mock.BAR_DATA));
                // Do serve data to view and wait for remote. 
                done();
            }).request(mock.FOO_URL);
        });
    });

    // Advance Methods -----------------------------------------------------------------------------------------------

    it('can request a response from remote [promise]', function(done) {
        papergirl.request(mock.FOO_URL).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            done();
        });
    });

    it('can get cached response from localForage after cached [promise]', function(done) {
        papergirl.request(mock.FOO_URL).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            papergirl.getData(mock.FOO_URL).then(function(data) {
                assert(expect(data).to.be(mock.FOO_DATA));
                done();
            });
        });
    });

    it('can remove cached response from localForage after cached [promise]', function(done) {
        papergirl.request(mock.FOO_URL).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            papergirl.getData(mock.FOO_URL).then(function(data) {
                assert(expect(data).to.be(mock.FOO_DATA));
                papergirl.removeData(mock.FOO_URL).then(function(data) {
                    assert(expect(data).to.not.be.ok);
                    done();
                });
            });
        });
    });

    it('will get `insert` call when no cached data [promise]', function(done) {

        var insert = function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            done();
        };

        papergirl.removeData(mock.FOO_URL).then(function(data) {
            assert(expect(data).to.not.be.ok);
            papergirl.request(mock.FOO_URL, {
                'strategy': papergirl.cacheFirst,
                'insert': insert
            }).then(function(data) {
                assert(expect(data).to.be(mock.FOO_DATA));
            });
        });
    });

    it('won\'t get `update` call when use cached data [promise]', function(done) {

        var update = function(data) {
            assert(expect(data).to.not.be.ok);
            throw new Error('This shouldn\'t be call');
        };

        papergirl.setData(mock.FOO_URL, mock.FOO_DATA).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            papergirl.request(mock.FOO_URL, {
                'strategy': papergirl.cacheFirst,
                'update': update
            }).then(function(data) {
                assert(expect(data).to.be(mock.FOO_DATA));
                done();
            });
        });
    });

    it('will get `upsert` call when no cached data [promise]', function(done) {

        var upsert = function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            done();
        };

        papergirl.removeData(mock.FOO_URL).then(function(data) {
            assert(expect(data).to.not.be.ok);
            papergirl.request(mock.FOO_URL, {
                'strategy': papergirl.cacheFirst,
                'upsert': upsert
            }).then(function(data) {
                assert(expect(data).to.be(mock.FOO_DATA));
            });
        });
    });

    it('will get `match` call when use cached data [promise]', function(done) {

        var match = function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            done();
        };

        papergirl.setData(mock.FOO_URL, mock.FOO_DATA).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            papergirl.request(mock.FOO_URL, {
                'strategy': papergirl.cacheFirst,
                'match': match
            }).then(function(data) {
                assert(expect(data).to.be(mock.FOO_DATA));
            });
        });
    });

    it('can get `etag` if has [promise]', function(done) {
        // etag will set after local events fire.
        var upsert = function(data, url, options) {
            assert(expect(data).to.be(mock.FOO_DATA));
            assert(expect(options.etag).to.be.ok);
            const _etag = options.etag;
            papergirl.getETAG(url).then(function(etag) {
                assert(expect(etag).to.be.ok);
                assert(expect(etag).to.be(_etag));
                done();
            });
        };

        // Retain etag
        var options = {
            'strategy': papergirl.cacheFirst,
            'upsert': upsert
        };

        papergirl.request(mock.FOO_URL, options).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
        });
    });

    // All Methods -----------------------------------------------------------------------------------------------

    it('can watch request after cached match for cache, beforeSend, onload, match, sync', function(done) {
        var events = [];

        // Simulated old content as FOO
        papergirl.setData(mock.FOO_URL, mock.FOO_DATA).then(function(data) {
            // Cached as FOO
            assert(expect(data).to.be(mock.FOO_DATA));
            // Load FOO from remote.
            papergirl.getCacheFirst(mock.FOO_URL, {
                // Occur when got cached data.
                'cache': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('cache');
                },
                // Intercept xhr request to modify headers before send.
                'beforeSend': function(xhr) {
                    assert(expect(xhr).to.be.ok);
                    events.push('beforeSend');
                },
                // Intercept xhr while onload
                'onload': function(xhr) {
                    assert(expect(xhr).to.be.ok);
                    events.push('onload');
                },
                // Occur when never cache before and get insert from remote.
                'insert': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('insert');
                },
                // Cached but not match from remote.
                'update': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('update');
                },
                // Cache is upsert from remote.
                'upsert': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('upsert');
                },
                // Cache data is match with remote data.
                'match': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('match');
                },
                // Cache is match with remote by ETag.
                'not_mod': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('not_mod');
                },
                // Occur after 200 OK and cached done.
                'sync': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('sync');
                    console.log(events);
                    assert(expect(events.join(',')).to.be(['cache', 'beforeSend', 'onload', 'match', 'sync'].join(',')));
                    done();
                }
            });
        });
    });

    it('can watch request after cached for cache, beforeSend, onload, update, upsert, sync', function(done) {
        var events = [];

        // Simulated old content as BAR
        papergirl.setData(mock.FOO_URL, mock.BAR_DATA).then(function(data) {
            // Cached as BAR
            assert(expect(data).to.be(mock.BAR_DATA));
            // Load FOO from remote.
            papergirl.getCacheFirst(mock.FOO_URL, {
                // Occur when got cached data.
                'cache': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('cache');
                },
                // Intercept xhr request to modify headers before send.
                'beforeSend': function(xhr) {
                    assert(expect(xhr).to.be.ok);
                    events.push('beforeSend');
                },
                // Intercept xhr while onload
                'onload': function(xhr) {
                    assert(expect(xhr).to.be.ok);
                    events.push('onload');
                },
                // Occur when never cache before and get insert from remote.
                'insert': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('insert');
                },
                // Cached but not match from remote.
                'update': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('update');
                },
                // Cache is upsert from remote.
                'upsert': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('upsert');
                },
                // Cache data is match with remote data.
                'match': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('match');
                },
                // Cache is match with remote by ETag.
                'not_mod': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('not_mod');
                },
                // Occur after 200 OK and cached done.
                'sync': function(data) {
                    assert(expect(data).to.be.ok);
                    events.push('sync');
                    assert(expect(events.join(',')).to.be(['cache', 'beforeSend', 'onload', 'update', 'upsert', 'sync'].join(',')));
                    done();
                }
            });
        });
    });

    it('can watch first request for beforeSend, onload, insert, upsert, sync', function(done) {
        var events = [];

        papergirl.getCacheFirst(mock.FOO_URL, {
            // Occur when got cached data.
            'cache': function(data) {
                assert(expect(data).to.be.ok);
                events.push('cache');
            },
            // Intercept xhr request to modify headers before send.
            'beforeSend': function(xhr) {
                assert(expect(xhr).to.be.ok);
                events.push('beforeSend');
            },
            // Intercept xhr while onload
            'onload': function(xhr) {
                assert(expect(xhr).to.be.ok);
                events.push('onload');
            },
            // Occur when never cache before and get insert from remote.
            'insert': function(data) {
                assert(expect(data).to.be.ok);
                events.push('insert');
            },
            // Cached but not match from remote.
            'update': function(data) {
                assert(expect(data).to.be.ok);
                events.push('update');
            },
            // Cache is upsert from remote.
            'upsert': function(data) {
                assert(expect(data).to.be.ok);
                events.push('upsert');
            },
            // Cache data is match with remote data.
            'match': function(data) {
                assert(expect(data).to.be.ok);
                events.push('match');
            },
            // Cache is match with remote by ETag.
            'not_mod': function(data) {
                assert(expect(data).to.be.ok);
                events.push('not_mod');
            },
            // Occur after 200 OK and cached done.
            'sync': function(data) {
                assert(expect(data).to.be.ok);
                events.push('sync');
                assert(expect(events.join(',')).to.be(['beforeSend', 'onload', 'insert', 'upsert', 'sync'].join(',')));
                done();
            }
        });
    });

    // Error Methods -----------------------------------------------------------------------------------------------

    it('can watch for 404 error [callback]', function(done) {
        papergirl.watch().onError(function(error) {
            assert(expect(error).to.be.an(Error));
            done();
        }).request('404.json');
    });

    it('can watch for 500 error [callback]', function(done) {
        this.timeout(6000);
        papergirl.watch().onError(function(error) {
            assert(expect(error).to.be.an(Error));
            done();
        }).request('https://localhost/404.json');
    });

    // Methods inherit from localforage -----------------------------------------------------------------------------------------------

    it('can set item via localForage [promise]', function(done) {
        papergirl.setData(mock.FOO_URL, mock.FOO_DATA).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            done();
        });
    });

    it('can get existng item via localForage [promise]', function(done) {
        papergirl.setData(mock.FOO_URL, mock.FOO_DATA).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            papergirl.getData(mock.FOO_URL).then(function(data) {
                assert(expect(data).to.be(mock.FOO_DATA));
                done();
            });
        });
    });

    it('can remove existng item via localForage [promise]', function(done) {
        papergirl.setData(mock.FOO_URL, mock.FOO_DATA).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            papergirl.getData(mock.FOO_URL).then(function(data) {
                assert(expect(data).to.be(mock.FOO_DATA));
                papergirl.removeData(mock.FOO_URL).then(function(data) {
                    assert(expect(data).to.not.be.ok);
                    done();
                });
            });
        });
    });

    // -TOTEST-

    /* Test failed via phantomjs but working via real browser
    it('will get `not_mod` call when use etag and cached data [promise]', function(done) {
        var not_mod = function(data) {
            if (url === mock.FOO_URL) {
                assert(expect(data).to.be(mock.FOO_DATA));
                done();
            }
        };
        
        papergirl.request(mock.FOO_URL).then(function(data) {
            assert(expect(data).to.be(mock.FOO_DATA));
            
            papergirl.request(mock.FOO_URL, {
                'not_mod': not_mod
            }).then(function(data) {
                assert(expect(data).to.be(mock.FOO_DATA));
            });
        });
    });
    */
});
