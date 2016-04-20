import localforage from 'localforage';

const papergirl = (function(globalObject) {
    'use strict';

    const GLOBAL_NAMESPACE = 'papergirl';
    const _S_ = '|';
    const _NS_ = GLOBAL_NAMESPACE + _S_;
    const version = '1.0.0';

    const _window = (function(window) {
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
            const promise = new Promise(function(resolve, reject) {
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
            const self = this;

            // Options?
            options = options || {};

            // Return a new promise.
            return new Promise(function(resolve, reject) {
                // Do the usual XHR stuff
                const xhr = options.xhr = XMLHttpRequest ? new XMLHttpRequest() : new window.ActiveXObject('Microsoft.XMLHTTP');

                xhr.open('GET', url);

                if (options.etag) {
                    xhr.setRequestHeader('If-None-Match', options.etag);
                }

                xhr.onload = function() {

                    // Hook onload state.
                    self._hook(options, 'onload', [xhr]);

                    // Free some ram.
                    self.delloc = function(options) {
                        if (options) {
                            delete options.xhr;
                            delete options.data;
                            delete options.etag;
                        }
                    };

                    switch (xhr.status) {
                        case 200:
                            // For faster reponse.
                            const responseText = xhr.responseText || null;

                            // Set data with etag.
                            var etag;
                            try {
                                etag = options.etag = xhr.getResponseHeader('etag') || null;
                            } catch (error) {
                                console.log(error);
                            }
                            
                            self.setData(url, responseText, etag).then(function(data) {
                                // Has cached?
                                if (options.data === null || typeof (options.data) === 'undefined') {
                                    // Insert : no cached data
                                    self._hook(options, 'insert', [data, url, options]);

                                    // Will hook upsert
                                    self._hook(options, 'upsert', [data, url, options]);
                                } else {
                                    // Cached, but equal?
                                    if ((options.data.length !== data.length) || (options.data !== data)) {
                                        // Update : cached size not equal new data size || cached data not equal new data 
                                        self._hook(options, 'update', [data, url, options]);

                                        // Will hook upsert
                                        self._hook(options, 'upsert', [data, url, options]);
                                    } else {
                                        // Local cached === Remote
                                        self._hook(options, 'match', [data, url, options]);
                                    }
                                }

                                // OK + cached
                                self._hook(options, 'sync', [data, url, options]);

                                // Done
                                resolve(responseText);

                                // Free some ram.
                                self.delloc(options);
                            });

                            break;
                        case 304:
                            // No update, will use data in local storage.
                            if (options.data) {
                                // Cached data.
                                resolve(options.data);

                                // Hook not modify
                                self._hook(options, 'not_mod', [options.data, url, options]);

                                // Free some ram.
                                self.delloc(options);
                            } else {
                                // Clear invalid data.
                                self.storage.removeData(url);

                                // Free some ram.
                                self.delloc(options);

                                // Retry without etag, should get 200.
                                self.request(url, options).then(resolve);
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
                xhr.onerror = function(e) {
                    reject(new Error('Request Error : ' + e.target.status));
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
            const self = this;

            // Options?
            options = options || {};

            // networkFirst
            options.strategy = options.strategy || this.cacheFirst;

            // Remote only
            if (options.strategy === this.networkOnly) {
                return self._request(url, options);
            }

            // networkFirst
            if (options.strategy === this.networkFirst) {
                return new Promise(function(resolve, reject) {
                    return self._request(url, options).then(function(data) {
                        // Success.
                        resolve(data);
                    }).catch(function(error) {
                        // Fail, try cache.
                        self.getData(url).then(function(data) {
                            if (data) {
                                resolve(data);
                            } else {
                                reject(new Error('Network Error and no cached. : ' + error));
                            }
                        });
                    });
                });
            }

            // cacheFirst
            return self.storage.getItem(_NS_ + url).then(function(item) {

                // Temporary inject : Use for speed look up overhead.
                const data = item ? item[0] : null;
                const etag = item ? item[1] : null;
                options.data = data;
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
            const self = this;
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
            const _me = me || {};
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
        
        onSend(func) {
            this._onSend = func;
            return this;
        }
        
        onLoad(func) {
            this._onLoad = func;
            return this;
        }
        
        onInsert(func) {
            this._onInsert = func;
            return this;
        }

        onUpdate(func) {
            this._onUpdate = func;
            return this;
        }

        onUpsert(func) {
            this._onUpsert = func;
            return this;
        }

        onMatch(func) {
            this._onMatch = func;
            return this;
        }

        onSync(func) {
            this._onSync = func;
            return this;
        }

        onError(func) {
            this._onError = func;
            return this;
        }

        request(url, options) {
            const self = this;
            options = options || {};
            options.strategy = this.cacheFirst;

            options.cache = this._onCache;
            options.beforeSend = this._onSend;
            options.onload = this._onLoad;
            options.insert = this._onInsert;
            options.update = this._onUpdate;
            options.upsert = this._onUpsert;
            options.match = this._onMatch;
            options.not_mod = this._onNotModified;
            options.sync = this._onSync;

            // Auto use local uri if has it in localhost origin.
            if (location.hostname === 'localhost' && this._local_uri) {
                url = this._local_uri;
            }

            this.parent.getCacheFirst(url, options).then(function() {
                self.delloc(self);
            }).catch(this._onError);

            return this;
        }

        local(uri) {
            this._local_uri = uri;
            return this;
        }

        delloc(self) {
            delete self.parent;
            delete self.me;
            delete self._onCache;
            delete self._onSend;
            delete self._onLoad;
            delete self._onInsert;
            delete self._onUpdate;
            delete self._onUpsert;
            delete self._onMatch;
            delete self._onNotModified;
            delete self._onSync;
            delete self._onError;
        }
    }

    // The actual papergirl object that we expose as a module or via a
    // global. It's extended by pulling in one of our other libraries.
    return new Papergirl();
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {}));
export default papergirl;
