import localforage from 'localforage';

var papergirl = (function(globalObject) {
    'use strict';

    var GLOBAL_NAMESPACE = 'papergirl';
    var _S_ = '|';
    var _NS_ = GLOBAL_NAMESPACE + _S_;
    var version = '1.0.0';

    var _window = (function(window) {
        return window;
    })(globalObject);

    function executeCallback(promise, callback, errorCallback) {
        if (typeof callback === 'function') {
            promise.then(callback);
        }

        if (typeof errorCallback === 'function') {
            promise.catch(errorCallback);
        }
    }

    class Papergirl {

        constructor(options) {
            this.cacheFirst = 'cacheFirst';
            this.networkFirst = 'networkFirst';
            this.cacheOnly = 'cacheOnly';
            this.networkOnly = 'networkOnly';

            // Global storage.
            options = options || {};
            options.name = options.name || _NS_ + 'public' + _S_ + version;
            this.storage = localforage.createInstance(options);
        }

        ready(callback) {
            var promise = new Promise(function(resolve, reject) {
                if (!_window) {
                    reject(new Error('Something wrong.'));
                } else {
                    resolve(_window);
                }
            });

            executeCallback(promise, callback, callback);
            return promise;
        }

        createInstance(options) {
            return new Papergirl(options);
        }

        // Methods -----------------------------------------------------------------------------------------------

        _request(url, options) {
            var self = this;

            // Options?
            options = options || {};

            // Return a new promise.
            return new Promise(function(resolve, reject) {
                // Do the usual XHR stuff
                var xhr = options.xhr = XMLHttpRequest ? new XMLHttpRequest() : new window.ActiveXObject('Microsoft.XMLHTTP');

                xhr.open('GET', url);

                if (options.etag) {
                    xhr.setRequestHeader('If-None-Match', options.etag);
                }

                xhr.onload = function() {

                    // Hook onload state.
                    self._hook(options, 'onload', [xhr]);

                    // Free some ram.
                    self.delloc = function(options) {
                        delete options.xhr;
                        delete options.responseText;
                    };

                    switch (xhr.status) {
                        case 200:
                            // For faster reponse.
                            var responseText = xhr.responseText || null;

                            // Set data with etag.
                            var etag;
                            try {
                                etag = options.etag = xhr.getResponseHeader('etag') || null;
                            } catch (e) {
                                console.log(e);
                            }

                            self.setData(url, responseText, etag).then(function(data) {
                                // Insert or Update?
                                var isUpsert = false;
                                if (options.responseText === null || typeof (options.responseText) === 'undefined') {
                                    // Insert : no cached data
                                    self._hook(options, 'insert', [data, url, options]);

                                    // Will hook upsert
                                    isUpsert = true;
                                } else if ((options.responseText.length !== data.length) || (options.responseText !== data)) {
                                    // Update : cached size not equal new data size || cached data not equal new data 
                                    self._hook(options, 'update', [data, url, options]);

                                    // Will hook upsert
                                    isUpsert = true;
                                }

                                // Upsert? : Insert or Update
                                if (isUpsert) {
                                    // Dirty.
                                    self._hook(options, 'upsert', [data, url, options]);
                                } else {
                                    // No upsert.
                                    self._hook(options, 'match', [data, url, options]);
                                }

                                // Free some ram.
                                self.delloc(options);

                                // Done
                                resolve(responseText);
                            });

                            break;
                        case 304:
                            // No update, will use data in local storage.
                            if (options.responseText) {
                                // Cached data.
                                resolve(options.responseText);

                                // Hook no modify
                                self._hook(options, 'not_mod', [options.responseText, url, options]);

                                // Free some ram.
                                self.delloc(options);
                            } else {
                                // Clear invalid data.
                                self.storage.removeData(url);

                                // Free some ram.
                                self.delloc(options);

                                // Retry without etag, should get 200.
                                self.request(url, options);
                            }

                            break;
                        default:
                            // Something wrong
                            reject(new Error(xhr.statusText));

                            // Free some ram.
                            self.delloc(options);
                            break;
                    }
                };

                // Handle network errors.
                xhr.onerror = function(error) {
                    reject(new Error('Network Error. : ' + error));
                };

                // Hook beforeSend state.
                self._hook(options, 'beforeSend', [xhr]);

                // Make a request.
                xhr.send();
            });
        }

        _hook(options, functionName, args) {
            if (options && typeof (options[functionName]) === 'function') {
                options[functionName].apply(this, args);

                // Each events should happen only once.
                options[functionName] = null;
            }
        }

        // Expected : options.name as String
        // Expected : upsert, insert, update, not_mod, remote, remote as function
        // Expected : options.strategy as papergirl.cacheFirst, papergirl.networkFirst, papergirl.cacheOnly, papergirl.networkOnly

        request(url, options) {
            var self = this;

            // Options?
            options = options || {};

            /// console.log('+options.strategy:' + options.strategy);
            // networkFirst
            options.strategy = options.strategy || this.cacheFirst;

            /// console.log('-options.strategy:' + options.strategy);

            // Remote only
            if (options.strategy === this.networkOnly) {
                return self._request(url, null, options);
            }

            // networkFirst
            if (options.strategy === this.networkFirst) {
                return new Promise(function(resolve, reject) {
                    return self._request(url, null, options).then(function(data) {
                        // Success.
                        resolve(data);
                    }).catch(function(e) {
                        // Fail, try cache.
                        self.getData(url).then(function(data) {
                            if (data) {
                                resolve(data);
                            } else {
                                reject(new Error('Network Error and no cached. : ' + e));
                            }
                        });
                    });
                });
            }

            // cacheFirst
            return self.storage.getItem(_NS_ + url).then(function(item) {

                // Temporary inject : Use for speed look up overhead.
                var data = item ? item[0] : null;
                var etag = item ? item[1] : null;
                options.responseText = data;
                options.etag = etag;

                // Rarely use, cache or die.
                if (options.strategy === self.cacheOnly) {
                    return new Promise(function(resolve, reject) {
                        if (data) {
                            resolve(data);
                        } else {
                            reject(new Error('No cached.'));
                        }
                    });
                }

                // Cached first.
                if (data && options.strategy === self.cacheFirst) {
                    self._hook(options, 'cache', [data, url, options]);
                }

                // Try fetch from remote.
                return self._request(url, options);
            });
        }

        // Core Methods -----------------------------------------------------------------------------------------------

        _getValueByIndex(index) {
            return function(item) {
                return new Promise(function(resolve) {
                    resolve((item && item.length > index) ? item[index] : null);
                });
            };
        }

        getData(url) {
            return this.storage.getItem(_NS_ + url).then(this._getValueByIndex(0));
        }

        setData(url, data, ...args) {
            return this.storage.setItem(_NS_ + url, [data].concat(args)).then(this._getValueByIndex(0));
        }

        removeData(url) {
            return this.storage.removeItem(_NS_ + url);
        }

        clear() {
            var self = this;
            return this.storage.iterate(function(value, key) {
                // TODO : Chain promise here?, Devare by storeName?
                if (key.indexOf(_NS_) === 0) {
                    self.storage.removeItem(key);
                }
            });
        }

        getETAG(url) {
            return this.storage.getItem(_NS_ + url).then(this._getValueByIndex(1));
        }

        // Public Methods -----------------------------------------------------------------------------------------------

        // Expected got_catch, upsert via options
        getCacheFirst(url, options) {
            // Cache first.
            options = options || {};
            options.strategy = this.cacheFirst;

            // Then remote.
            return this.request(url, options);
        }

        watch(me) {
            // TODO : unique, timeout
            var _me = me || {};
            return new F(this, _me);
        }
    }

    class F {

        constructor(parent, me) {
            this.parent = parent;
            this.me = me;
        }

        onCache(func) {
            this._onCache = func;

            return this;
        }

        onRemote(func) {
            this._onRemote = func;
            return this;
        }

        onError(func) {
            this._onError = func;
            return this;
        }

        request(url, options) {
            options = options || {};
            options.strategy = this.cacheFirst;

            options.cache = this._onCache;
            options.upsert = this._onRemote;

            this.parent.getCacheFirst(url, options).then(this.delloc).catch(this._onError);
            return this;
        }

        delloc() {
            delete this.parent;
            delete this.me;
            delete this._onCache;
            delete this._onRemote;
            delete this._onError;
        }
    }

    // The actual papergirl object that we expose as a module or via a
    // global. It's extended by pulling in one of our other libraries.
    return new Papergirl();
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {}));
export default papergirl;
