/*!
    Papergirl -- XHR+ETAG
    Version 0.8.0
*/
(function() {
var define, requireModule, require, requirejs;

(function() {
  var registry = {}, seen = {};

  define = function(name, deps, callback) {
    registry[name] = { deps: deps, callback: callback };
  };

  requirejs = require = requireModule = function(name) {
  requirejs._eak_seen = registry;

    if (seen[name]) { return seen[name]; }
    seen[name] = {};

    if (!registry[name]) {
      throw new Error("Could not find module " + name);
    }

    var mod = registry[name],
        deps = mod.deps,
        callback = mod.callback,
        reified = [],
        exports;

    for (var i=0, l=deps.length; i<l; i++) {
      if (deps[i] === 'exports') {
        reified.push(exports = {});
      } else {
        reified.push(requireModule(resolve(deps[i])));
      }
    }

    var value = callback.apply(this, reified);
    return seen[name] = exports || value;

    function resolve(child) {
      if (child.charAt(0) !== '.') { return child; }
      var parts = child.split("/");
      var parentBase = name.split("/").slice(0, -1);

      for (var i=0, l=parts.length; i<l; i++) {
        var part = parts[i];

        if (part === '..') { parentBase.pop(); }
        else if (part === '.') { continue; }
        else { parentBase.push(part); }
      }

      return parentBase.join("/");
    }
  };
})();

define("promise/all", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */

    var isArray = __dependency1__.isArray;
    var isFunction = __dependency1__.isFunction;

    /**
      Returns a promise that is fulfilled when all the given promises have been
      fulfilled, or rejected if any of them become rejected. The return promise
      is fulfilled with an array that gives all the values in the order they were
      passed in the `promises` array argument.

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.resolve(2);
      var promise3 = RSVP.resolve(3);
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // The array here would be [ 1, 2, 3 ];
      });
      ```

      If any of the `promises` given to `RSVP.all` are rejected, the first promise
      that is rejected will be given as an argument to the returned promises's
      rejection handler. For example:

      Example:

      ```javascript
      var promise1 = RSVP.resolve(1);
      var promise2 = RSVP.reject(new Error("2"));
      var promise3 = RSVP.reject(new Error("3"));
      var promises = [ promise1, promise2, promise3 ];

      RSVP.all(promises).then(function(array){
        // Code here never runs because there are rejected promises!
      }, function(error) {
        // error.message === "2"
      });
      ```

      @method all
      @for RSVP
      @param {Array} promises
      @param {String} label
      @return {Promise} promise that is fulfilled when all `promises` have been
      fulfilled, or rejected if any of them become rejected.
    */
    function all(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to all.');
      }

      return new Promise(function(resolve, reject) {
        var results = [], remaining = promises.length,
        promise;

        if (remaining === 0) {
          resolve([]);
        }

        function resolver(index) {
          return function(value) {
            resolveAll(index, value);
          };
        }

        function resolveAll(index, value) {
          results[index] = value;
          if (--remaining === 0) {
            resolve(results);
          }
        }

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && isFunction(promise.then)) {
            promise.then(resolver(i), reject);
          } else {
            resolveAll(i, promise);
          }
        }
      });
    }

    __exports__.all = all;
  });
define("promise/asap", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var browserGlobal = (typeof window !== 'undefined') ? window : {};
    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
    var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

    // node
    function useNextTick() {
      return function() {
        process.nextTick(flush);
      };
    }

    function useMutationObserver() {
      var iterations = 0;
      var observer = new BrowserMutationObserver(flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    function useSetTimeout() {
      return function() {
        local.setTimeout(flush, 1);
      };
    }

    var queue = [];
    function flush() {
      for (var i = 0; i < queue.length; i++) {
        var tuple = queue[i];
        var callback = tuple[0], arg = tuple[1];
        callback(arg);
      }
      queue = [];
    }

    var scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      scheduleFlush = useNextTick();
    } else if (BrowserMutationObserver) {
      scheduleFlush = useMutationObserver();
    } else {
      scheduleFlush = useSetTimeout();
    }

    function asap(callback, arg) {
      var length = queue.push([callback, arg]);
      if (length === 1) {
        // If length is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        scheduleFlush();
      }
    }

    __exports__.asap = asap;
  });
define("promise/config", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var config = {
      instrument: false
    };

    function configure(name, value) {
      if (arguments.length === 2) {
        config[name] = value;
      } else {
        return config[name];
      }
    }

    __exports__.config = config;
    __exports__.configure = configure;
  });
define("promise/polyfill", 
  ["./promise","./utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*global self*/
    var RSVPPromise = __dependency1__.Promise;
    var isFunction = __dependency2__.isFunction;

    function polyfill() {
      var local;

      if (typeof global !== 'undefined') {
        local = global;
      } else if (typeof window !== 'undefined' && window.document) {
        local = window;
      } else {
        local = self;
      }

      var es6PromiseSupport = 
        "Promise" in local &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "resolve" in local.Promise &&
        "reject" in local.Promise &&
        "all" in local.Promise &&
        "race" in local.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new local.Promise(function(r) { resolve = r; });
          return isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        local.Promise = RSVPPromise;
      }
    }

    __exports__.polyfill = polyfill;
  });
define("promise/promise", 
  ["./config","./utils","./all","./race","./resolve","./reject","./asap","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var configure = __dependency1__.configure;
    var objectOrFunction = __dependency2__.objectOrFunction;
    var isFunction = __dependency2__.isFunction;
    var now = __dependency2__.now;
    var all = __dependency3__.all;
    var race = __dependency4__.race;
    var staticResolve = __dependency5__.resolve;
    var staticReject = __dependency6__.reject;
    var asap = __dependency7__.asap;

    var counter = 0;

    config.async = asap; // default async is asap;

    function Promise(resolver) {
      if (!isFunction(resolver)) {
        throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
      }

      if (!(this instanceof Promise)) {
        throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
      }

      this._subscribers = [];

      invokeResolver(resolver, this);
    }

    function invokeResolver(resolver, promise) {
      function resolvePromise(value) {
        resolve(promise, value);
      }

      function rejectPromise(reason) {
        reject(promise, reason);
      }

      try {
        resolver(resolvePromise, rejectPromise);
      } catch(e) {
        rejectPromise(e);
      }
    }

    function invokeCallback(settled, promise, callback, detail) {
      var hasCallback = isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        try {
          value = callback(detail);
          succeeded = true;
        } catch(e) {
          failed = true;
          error = e;
        }
      } else {
        value = detail;
        succeeded = true;
      }

      if (handleThenable(promise, value)) {
        return;
      } else if (hasCallback && succeeded) {
        resolve(promise, value);
      } else if (failed) {
        reject(promise, error);
      } else if (settled === FULFILLED) {
        resolve(promise, value);
      } else if (settled === REJECTED) {
        reject(promise, value);
      }
    }

    var PENDING   = void 0;
    var SEALED    = 0;
    var FULFILLED = 1;
    var REJECTED  = 2;

    function subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      subscribers[length] = child;
      subscribers[length + FULFILLED] = onFulfillment;
      subscribers[length + REJECTED]  = onRejection;
    }

    function publish(promise, settled) {
      var child, callback, subscribers = promise._subscribers, detail = promise._detail;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        invokeCallback(settled, child, callback, detail);
      }

      promise._subscribers = null;
    }

    Promise.prototype = {
      constructor: Promise,

      _state: undefined,
      _detail: undefined,
      _subscribers: undefined,

      then: function(onFulfillment, onRejection) {
        var promise = this;

        var thenPromise = new this.constructor(function() {});

        if (this._state) {
          var callbacks = arguments;
          config.async(function invokePromiseCallback() {
            invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
          });
        } else {
          subscribe(this, thenPromise, onFulfillment, onRejection);
        }

        return thenPromise;
      },

      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    Promise.all = all;
    Promise.race = race;
    Promise.resolve = staticResolve;
    Promise.reject = staticReject;

    function handleThenable(promise, value) {
      var then = null,
      resolved;

      try {
        if (promise === value) {
          throw new TypeError("A promises callback cannot return that same promise.");
        }

        if (objectOrFunction(value)) {
          then = value.then;

          if (isFunction(then)) {
            then.call(value, function(val) {
              if (resolved) { return true; }
              resolved = true;

              if (value !== val) {
                resolve(promise, val);
              } else {
                fulfill(promise, val);
              }
            }, function(val) {
              if (resolved) { return true; }
              resolved = true;

              reject(promise, val);
            });

            return true;
          }
        }
      } catch (error) {
        if (resolved) { return true; }
        reject(promise, error);
        return true;
      }

      return false;
    }

    function resolve(promise, value) {
      if (promise === value) {
        fulfill(promise, value);
      } else if (!handleThenable(promise, value)) {
        fulfill(promise, value);
      }
    }

    function fulfill(promise, value) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = value;

      config.async(publishFulfillment, promise);
    }

    function reject(promise, reason) {
      if (promise._state !== PENDING) { return; }
      promise._state = SEALED;
      promise._detail = reason;

      config.async(publishRejection, promise);
    }

    function publishFulfillment(promise) {
      publish(promise, promise._state = FULFILLED);
    }

    function publishRejection(promise) {
      publish(promise, promise._state = REJECTED);
    }

    __exports__.Promise = Promise;
  });
define("promise/race", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global toString */
    var isArray = __dependency1__.isArray;

    /**
      `RSVP.race` allows you to watch a series of promises and act as soon as the
      first promise given to the `promises` argument fulfills or rejects.

      Example:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 2");
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // result === "promise 2" because it was resolved before promise1
        // was resolved.
      });
      ```

      `RSVP.race` is deterministic in that only the state of the first completed
      promise matters. For example, even if other promises given to the `promises`
      array argument are resolved, but the first completed promise has become
      rejected before the other promises became fulfilled, the returned promise
      will become rejected:

      ```javascript
      var promise1 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          resolve("promise 1");
        }, 200);
      });

      var promise2 = new RSVP.Promise(function(resolve, reject){
        setTimeout(function(){
          reject(new Error("promise 2"));
        }, 100);
      });

      RSVP.race([promise1, promise2]).then(function(result){
        // Code here never runs because there are rejected promises!
      }, function(reason){
        // reason.message === "promise2" because promise 2 became rejected before
        // promise 1 became fulfilled
      });
      ```

      @method race
      @for RSVP
      @param {Array} promises array of promises to observe
      @param {String} label optional string for describing the promise returned.
      Useful for tooling.
      @return {Promise} a promise that becomes fulfilled with the value the first
      completed promises is resolved with if the first completed promise was
      fulfilled, or rejected with the reason that the first completed promise
      was rejected with.
    */
    function race(promises) {
      /*jshint validthis:true */
      var Promise = this;

      if (!isArray(promises)) {
        throw new TypeError('You must pass an array to race.');
      }
      return new Promise(function(resolve, reject) {
        var results = [], promise;

        for (var i = 0; i < promises.length; i++) {
          promise = promises[i];

          if (promise && typeof promise.then === 'function') {
            promise.then(resolve, reject);
          } else {
            resolve(promise);
          }
        }
      });
    }

    __exports__.race = race;
  });
define("promise/reject", 
  ["exports"],
  function(__exports__) {
    "use strict";
    /**
      `RSVP.reject` returns a promise that will become rejected with the passed
      `reason`. `RSVP.reject` is essentially shorthand for the following:

      ```javascript
      var promise = new RSVP.Promise(function(resolve, reject){
        reject(new Error('WHOOPS'));
      });

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      Instead of writing the above, your code now simply becomes the following:

      ```javascript
      var promise = RSVP.reject(new Error('WHOOPS'));

      promise.then(function(value){
        // Code here doesn't run because the promise is rejected!
      }, function(reason){
        // reason.message === 'WHOOPS'
      });
      ```

      @method reject
      @for RSVP
      @param {Any} reason value that the returned promise will be rejected with.
      @param {String} label optional string for identifying the returned promise.
      Useful for tooling.
      @return {Promise} a promise that will become rejected with the given
      `reason`.
    */
    function reject(reason) {
      /*jshint validthis:true */
      var Promise = this;

      return new Promise(function (resolve, reject) {
        reject(reason);
      });
    }

    __exports__.reject = reject;
  });
define("promise/resolve", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function resolve(value) {
      /*jshint validthis:true */
      if (value && typeof value === 'object' && value.constructor === this) {
        return value;
      }

      var Promise = this;

      return new Promise(function(resolve) {
        resolve(value);
      });
    }

    __exports__.resolve = resolve;
  });
define("promise/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function objectOrFunction(x) {
      return isFunction(x) || (typeof x === "object" && x !== null);
    }

    function isFunction(x) {
      return typeof x === "function";
    }

    function isArray(x) {
      return Object.prototype.toString.call(x) === "[object Array]";
    }

    // Date.now is not available in browsers < IE9
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
    var now = Date.now || function() { return new Date().getTime(); };


    __exports__.objectOrFunction = objectOrFunction;
    __exports__.isFunction = isFunction;
    __exports__.isArray = isArray;
    __exports__.now = now;
  });
requireModule('promise/polyfill').polyfill();
}());(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["papergirl"] = factory();
	else
		root["papergirl"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _localforage = __webpack_require__(1);

	var _localforage2 = _interopRequireDefault(_localforage);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var papergirl = function (globalObject) {
	    'use strict';

	    var GLOBAL_NAMESPACE = 'papergirl';
	    var _S_ = '|';
	    var _NS_ = GLOBAL_NAMESPACE + _S_;
	    var version = '1.0.0';

	    var _window = function (window) {
	        return window;
	    }(globalObject);

	    function executeCallback(promise, callback, errorCallback) {
	        if (typeof callback === 'function') {
	            promise.then(callback);
	        }

	        if (typeof errorCallback === 'function') {
	            promise["catch"](errorCallback);
	        }
	    }

	    var Papergirl = function () {
	        function Papergirl(options) {
	            _classCallCheck(this, Papergirl);

	            this.cacheFirst = 'cacheFirst';
	            this.networkFirst = 'networkFirst';
	            this.cacheOnly = 'cacheOnly';
	            this.networkOnly = 'networkOnly';

	            // Global storage.
	            options = options || {};
	            options.name = options.name || _NS_ + 'public' + _S_ + version;
	            this.storage = _localforage2["default"].createInstance(options);
	        }

	        Papergirl.prototype.ready = function ready(callback) {
	            var promise = new Promise(function (resolve, reject) {
	                if (!_window) {
	                    reject(new Error('Something wrong.'));
	                } else {
	                    resolve(_window);
	                }
	            });

	            executeCallback(promise, callback, callback);
	            return promise;
	        };

	        Papergirl.prototype.createInstance = function createInstance(options) {
	            return new Papergirl(options);
	        };

	        // Methods -----------------------------------------------------------------------------------------------

	        Papergirl.prototype._request = function _request(url, options) {
	            var self = this;

	            // Options?
	            options = options || {};

	            // Return a new promise.
	            return new Promise(function (resolve, reject) {
	                // Do the usual XHR stuff
	                var xhr = options.xhr = XMLHttpRequest ? new XMLHttpRequest() : new window.ActiveXObject('Microsoft.XMLHTTP');

	                xhr.open('GET', url);

	                if (options.etag) {
	                    xhr.setRequestHeader('If-None-Match', options.etag);
	                }

	                xhr.onload = function () {

	                    // Hook onload state.
	                    self._hook(options, 'load', [xhr]);

	                    // Free some ram.
	                    self.delloc = function (options) {
	                        if (options) {
	                            delete options.xhr;
	                            delete options.data;
	                            delete options.etag;
	                        }
	                    };

	                    switch (xhr.status) {
	                        case 200:
	                            // For faster reponse.
	                            var responseText = xhr.responseText || null;

	                            // Set data with etag.
	                            var etag;
	                            try {
	                                etag = options.etag = xhr.getResponseHeader('etag') || null;
	                            } catch (error) {
	                                console.log(error);
	                            }

	                            self.setData(url, responseText, etag).then(function (data) {
	                                // Has cached?
	                                if (options.data === null || typeof options.data === 'undefined') {
	                                    // Insert : no cached data
	                                    self._hook(options, 'insert', [data, url, options]);

	                                    // Will hook upsert
	                                    self._hook(options, 'upsert', [data, url, options]);
	                                } else {
	                                    // Cached, but equal?
	                                    if (options.data.length !== data.length || options.data !== data) {
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
	                                // Hook not modify
	                                self._hook(options, 'not_mod', [options.data, url, options]);

	                                // OK, from cached
	                                self._hook(options, 'sync', [options.data, url, options]);

	                                // Cached data.
	                                resolve(options.data);

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
	                xhr.onerror = function (e) {
	                    reject(new Error('Request Error : ' + e.target.status));
	                };

	                // Hook send state.
	                self._hook(options, 'send', [xhr]);

	                // Make a request.
	                xhr.send();
	            });
	        };

	        Papergirl.prototype._hook = function _hook(options, functionName, args) {
	            if (options && typeof options[functionName] === 'function') {
	                options[functionName].apply(this, args);

	                // Each events should happen only once.
	                options[functionName] = null;
	            }
	        };

	        // Expected : options.name as String
	        // Expected : upsert, insert, update, not_mod, remote, remote as function
	        // Expected : options.strategy as papergirl.cacheFirst, papergirl.networkFirst, papergirl.cacheOnly, papergirl.networkOnly

	        Papergirl.prototype.request = function request(url, options) {
	            var self = this;

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
	                return new Promise(function (resolve, reject) {
	                    return self._request(url, options).then(function (data) {
	                        // Success.
	                        resolve(data);
	                    })["catch"](function (error) {
	                        // Fail, try cache.
	                        self.getData(url).then(function (data) {
	                            if (data) {
	                                // Cache later.
	                                self._hook(options, 'cache', [data, url, options]);
	                                resolve(data);
	                            } else {
	                                reject(new Error('Network Error and no cached. : ' + error));
	                            }
	                        });
	                    });
	                });
	            }

	            // cacheFirst
	            return self.storage.getItem(_NS_ + url).then(function (item) {

	                // Temporary inject : Use for speed look up overhead.
	                var data = item ? item[0] : null;
	                var etag = item ? item[1] : null;
	                options.data = data;
	                options.etag = etag;

	                // Rarely use, cache or die.
	                if (options.strategy === self.cacheOnly) {
	                    return new Promise(function (resolve, reject) {
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
	        };

	        // Core Methods -----------------------------------------------------------------------------------------------

	        Papergirl.prototype._getValueByIndex = function _getValueByIndex(index) {
	            return function (item) {
	                return new Promise(function (resolve) {
	                    resolve(item && item.length > index ? item[index] : null);
	                });
	            };
	        };

	        Papergirl.prototype.getData = function getData(url) {
	            return this.storage.getItem(_NS_ + url).then(this._getValueByIndex(0));
	        };

	        Papergirl.prototype.setData = function setData(url, data) {
	            for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
	                args[_key - 2] = arguments[_key];
	            }

	            return this.storage.setItem(_NS_ + url, [data].concat(args)).then(this._getValueByIndex(0));
	        };

	        Papergirl.prototype.removeData = function removeData(url) {
	            return this.storage.removeItem(_NS_ + url);
	        };

	        Papergirl.prototype.clear = function clear() {
	            var self = this;
	            return this.storage.iterate(function (value, key) {
	                // TODO : Chain promise here?, Devare by storeName?
	                if (key.indexOf(_NS_) === 0) {
	                    self.storage.removeItem(key);
	                }
	            });
	        };

	        Papergirl.prototype.getETAG = function getETAG(url) {
	            return this.storage.getItem(_NS_ + url).then(this._getValueByIndex(1));
	        };

	        // Public Methods -----------------------------------------------------------------------------------------------

	        Papergirl.prototype.watch = function watch(me) {
	            // TODO : unique, timeout
	            var _me = me || {};
	            return new F(this, _me);
	        };

	        return Papergirl;
	    }();

	    var F = function () {
	        function F(parent, me) {
	            _classCallCheck(this, F);

	            this.parent = parent;
	            this.me = me;
	        }

	        F.prototype.onCache = function onCache(func) {
	            this._onCache = func;
	            return this;
	        };

	        F.prototype.onSend = function onSend(func) {
	            this._onSend = func;
	            return this;
	        };

	        F.prototype.onLoad = function onLoad(func) {
	            this._onLoad = func;
	            return this;
	        };

	        F.prototype.onInsert = function onInsert(func) {
	            this._onInsert = func;
	            return this;
	        };

	        F.prototype.onUpdate = function onUpdate(func) {
	            this._onUpdate = func;
	            return this;
	        };

	        F.prototype.onUpsert = function onUpsert(func) {
	            this._onUpsert = func;
	            return this;
	        };

	        F.prototype.onMatch = function onMatch(func) {
	            this._onMatch = func;
	            return this;
	        };

	        F.prototype.onSync = function onSync(func) {
	            this._onSync = func;
	            return this;
	        };

	        F.prototype.onError = function onError(func) {
	            this._onError = func;
	            return this;
	        };

	        F.prototype.getCacheFirst = function getCacheFirst(url, options) {
	            // Cache first.
	            options = options || {};
	            options.strategy = this.parent.cacheFirst;

	            // Then remote.
	            return this.request(url, options);
	        };

	        F.prototype.getNetworkFirst = function getNetworkFirst(url, options) {
	            // Cache first.
	            options = options || {};
	            options.strategy = this.parent.networkFirst;

	            // Then remote.
	            return this.request(url, options);
	        };

	        F.prototype.request = function request(url, options) {
	            var self = this;
	            options = options || {};
	            options.strategy = options.strategy || this.parent.cacheFirst;

	            options.cache = this._onCache;
	            options.send = this._onSend;
	            options.load = this._onLoad;
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

	            this.parent.request(url, options).then(function () {
	                self.delloc(self);
	            })["catch"](this._onError);

	            return this;
	        };

	        F.prototype.local = function local(uri) {
	            this._local_uri = uri;
	            return this;
	        };

	        F.prototype.delloc = function delloc(self) {
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
	        };

	        return F;
	    }();

	    // The actual papergirl object that we expose as a module or via a
	    // global. It's extended by pulling in one of our other libraries.


	    return new Papergirl();
	}(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {});
	exports["default"] = papergirl;
	module.exports = exports['default'];

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var require;/* WEBPACK VAR INJECTION */(function(global, process) {/*!
	    localForage -- Offline Storage, Improved
	    Version 1.4.0
	    https://mozilla.github.io/localForage
	    (c) 2013-2015 Mozilla, Apache License 2.0
	*/
	(function() {
	var define, requireModule, require, requirejs;

	(function() {
	  var registry = {}, seen = {};

	  define = function(name, deps, callback) {
	    registry[name] = { deps: deps, callback: callback };
	  };

	  requirejs = require = requireModule = function(name) {
	  requirejs._eak_seen = registry;

	    if (seen[name]) { return seen[name]; }
	    seen[name] = {};

	    if (!registry[name]) {
	      throw new Error("Could not find module " + name);
	    }

	    var mod = registry[name],
	        deps = mod.deps,
	        callback = mod.callback,
	        reified = [],
	        exports;

	    for (var i=0, l=deps.length; i<l; i++) {
	      if (deps[i] === 'exports') {
	        reified.push(exports = {});
	      } else {
	        reified.push(requireModule(resolve(deps[i])));
	      }
	    }

	    var value = callback.apply(this, reified);
	    return seen[name] = exports || value;

	    function resolve(child) {
	      if (child.charAt(0) !== '.') { return child; }
	      var parts = child.split("/");
	      var parentBase = name.split("/").slice(0, -1);

	      for (var i=0, l=parts.length; i<l; i++) {
	        var part = parts[i];

	        if (part === '..') { parentBase.pop(); }
	        else if (part === '.') { continue; }
	        else { parentBase.push(part); }
	      }

	      return parentBase.join("/");
	    }
	  };
	})();

	define("promise/all", 
	  ["./utils","exports"],
	  function(__dependency1__, __exports__) {
	    "use strict";
	    /* global toString */

	    var isArray = __dependency1__.isArray;
	    var isFunction = __dependency1__.isFunction;

	    /**
	      Returns a promise that is fulfilled when all the given promises have been
	      fulfilled, or rejected if any of them become rejected. The return promise
	      is fulfilled with an array that gives all the values in the order they were
	      passed in the `promises` array argument.

	      Example:

	      ```javascript
	      var promise1 = RSVP.resolve(1);
	      var promise2 = RSVP.resolve(2);
	      var promise3 = RSVP.resolve(3);
	      var promises = [ promise1, promise2, promise3 ];

	      RSVP.all(promises).then(function(array){
	        // The array here would be [ 1, 2, 3 ];
	      });
	      ```

	      If any of the `promises` given to `RSVP.all` are rejected, the first promise
	      that is rejected will be given as an argument to the returned promises's
	      rejection handler. For example:

	      Example:

	      ```javascript
	      var promise1 = RSVP.resolve(1);
	      var promise2 = RSVP.reject(new Error("2"));
	      var promise3 = RSVP.reject(new Error("3"));
	      var promises = [ promise1, promise2, promise3 ];

	      RSVP.all(promises).then(function(array){
	        // Code here never runs because there are rejected promises!
	      }, function(error) {
	        // error.message === "2"
	      });
	      ```

	      @method all
	      @for RSVP
	      @param {Array} promises
	      @param {String} label
	      @return {Promise} promise that is fulfilled when all `promises` have been
	      fulfilled, or rejected if any of them become rejected.
	    */
	    function all(promises) {
	      /*jshint validthis:true */
	      var Promise = this;

	      if (!isArray(promises)) {
	        throw new TypeError('You must pass an array to all.');
	      }

	      return new Promise(function(resolve, reject) {
	        var results = [], remaining = promises.length,
	        promise;

	        if (remaining === 0) {
	          resolve([]);
	        }

	        function resolver(index) {
	          return function(value) {
	            resolveAll(index, value);
	          };
	        }

	        function resolveAll(index, value) {
	          results[index] = value;
	          if (--remaining === 0) {
	            resolve(results);
	          }
	        }

	        for (var i = 0; i < promises.length; i++) {
	          promise = promises[i];

	          if (promise && isFunction(promise.then)) {
	            promise.then(resolver(i), reject);
	          } else {
	            resolveAll(i, promise);
	          }
	        }
	      });
	    }

	    __exports__.all = all;
	  });
	define("promise/asap", 
	  ["exports"],
	  function(__exports__) {
	    "use strict";
	    var browserGlobal = (typeof window !== 'undefined') ? window : {};
	    var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
	    var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

	    // node
	    function useNextTick() {
	      return function() {
	        process.nextTick(flush);
	      };
	    }

	    function useMutationObserver() {
	      var iterations = 0;
	      var observer = new BrowserMutationObserver(flush);
	      var node = document.createTextNode('');
	      observer.observe(node, { characterData: true });

	      return function() {
	        node.data = (iterations = ++iterations % 2);
	      };
	    }

	    function useSetTimeout() {
	      return function() {
	        local.setTimeout(flush, 1);
	      };
	    }

	    var queue = [];
	    function flush() {
	      for (var i = 0; i < queue.length; i++) {
	        var tuple = queue[i];
	        var callback = tuple[0], arg = tuple[1];
	        callback(arg);
	      }
	      queue = [];
	    }

	    var scheduleFlush;

	    // Decide what async method to use to triggering processing of queued callbacks:
	    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
	      scheduleFlush = useNextTick();
	    } else if (BrowserMutationObserver) {
	      scheduleFlush = useMutationObserver();
	    } else {
	      scheduleFlush = useSetTimeout();
	    }

	    function asap(callback, arg) {
	      var length = queue.push([callback, arg]);
	      if (length === 1) {
	        // If length is 1, that means that we need to schedule an async flush.
	        // If additional callbacks are queued before the queue is flushed, they
	        // will be processed by this flush that we are scheduling.
	        scheduleFlush();
	      }
	    }

	    __exports__.asap = asap;
	  });
	define("promise/config", 
	  ["exports"],
	  function(__exports__) {
	    "use strict";
	    var config = {
	      instrument: false
	    };

	    function configure(name, value) {
	      if (arguments.length === 2) {
	        config[name] = value;
	      } else {
	        return config[name];
	      }
	    }

	    __exports__.config = config;
	    __exports__.configure = configure;
	  });
	define("promise/polyfill", 
	  ["./promise","./utils","exports"],
	  function(__dependency1__, __dependency2__, __exports__) {
	    "use strict";
	    /*global self*/
	    var RSVPPromise = __dependency1__.Promise;
	    var isFunction = __dependency2__.isFunction;

	    function polyfill() {
	      var local;

	      if (typeof global !== 'undefined') {
	        local = global;
	      } else if (typeof window !== 'undefined' && window.document) {
	        local = window;
	      } else {
	        local = self;
	      }

	      var es6PromiseSupport = 
	        "Promise" in local &&
	        // Some of these methods are missing from
	        // Firefox/Chrome experimental implementations
	        "resolve" in local.Promise &&
	        "reject" in local.Promise &&
	        "all" in local.Promise &&
	        "race" in local.Promise &&
	        // Older version of the spec had a resolver object
	        // as the arg rather than a function
	        (function() {
	          var resolve;
	          new local.Promise(function(r) { resolve = r; });
	          return isFunction(resolve);
	        }());

	      if (!es6PromiseSupport) {
	        local.Promise = RSVPPromise;
	      }
	    }

	    __exports__.polyfill = polyfill;
	  });
	define("promise/promise", 
	  ["./config","./utils","./all","./race","./resolve","./reject","./asap","exports"],
	  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
	    "use strict";
	    var config = __dependency1__.config;
	    var configure = __dependency1__.configure;
	    var objectOrFunction = __dependency2__.objectOrFunction;
	    var isFunction = __dependency2__.isFunction;
	    var now = __dependency2__.now;
	    var all = __dependency3__.all;
	    var race = __dependency4__.race;
	    var staticResolve = __dependency5__.resolve;
	    var staticReject = __dependency6__.reject;
	    var asap = __dependency7__.asap;

	    var counter = 0;

	    config.async = asap; // default async is asap;

	    function Promise(resolver) {
	      if (!isFunction(resolver)) {
	        throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
	      }

	      if (!(this instanceof Promise)) {
	        throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
	      }

	      this._subscribers = [];

	      invokeResolver(resolver, this);
	    }

	    function invokeResolver(resolver, promise) {
	      function resolvePromise(value) {
	        resolve(promise, value);
	      }

	      function rejectPromise(reason) {
	        reject(promise, reason);
	      }

	      try {
	        resolver(resolvePromise, rejectPromise);
	      } catch(e) {
	        rejectPromise(e);
	      }
	    }

	    function invokeCallback(settled, promise, callback, detail) {
	      var hasCallback = isFunction(callback),
	          value, error, succeeded, failed;

	      if (hasCallback) {
	        try {
	          value = callback(detail);
	          succeeded = true;
	        } catch(e) {
	          failed = true;
	          error = e;
	        }
	      } else {
	        value = detail;
	        succeeded = true;
	      }

	      if (handleThenable(promise, value)) {
	        return;
	      } else if (hasCallback && succeeded) {
	        resolve(promise, value);
	      } else if (failed) {
	        reject(promise, error);
	      } else if (settled === FULFILLED) {
	        resolve(promise, value);
	      } else if (settled === REJECTED) {
	        reject(promise, value);
	      }
	    }

	    var PENDING   = void 0;
	    var SEALED    = 0;
	    var FULFILLED = 1;
	    var REJECTED  = 2;

	    function subscribe(parent, child, onFulfillment, onRejection) {
	      var subscribers = parent._subscribers;
	      var length = subscribers.length;

	      subscribers[length] = child;
	      subscribers[length + FULFILLED] = onFulfillment;
	      subscribers[length + REJECTED]  = onRejection;
	    }

	    function publish(promise, settled) {
	      var child, callback, subscribers = promise._subscribers, detail = promise._detail;

	      for (var i = 0; i < subscribers.length; i += 3) {
	        child = subscribers[i];
	        callback = subscribers[i + settled];

	        invokeCallback(settled, child, callback, detail);
	      }

	      promise._subscribers = null;
	    }

	    Promise.prototype = {
	      constructor: Promise,

	      _state: undefined,
	      _detail: undefined,
	      _subscribers: undefined,

	      then: function(onFulfillment, onRejection) {
	        var promise = this;

	        var thenPromise = new this.constructor(function() {});

	        if (this._state) {
	          var callbacks = arguments;
	          config.async(function invokePromiseCallback() {
	            invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
	          });
	        } else {
	          subscribe(this, thenPromise, onFulfillment, onRejection);
	        }

	        return thenPromise;
	      },

	      'catch': function(onRejection) {
	        return this.then(null, onRejection);
	      }
	    };

	    Promise.all = all;
	    Promise.race = race;
	    Promise.resolve = staticResolve;
	    Promise.reject = staticReject;

	    function handleThenable(promise, value) {
	      var then = null,
	      resolved;

	      try {
	        if (promise === value) {
	          throw new TypeError("A promises callback cannot return that same promise.");
	        }

	        if (objectOrFunction(value)) {
	          then = value.then;

	          if (isFunction(then)) {
	            then.call(value, function(val) {
	              if (resolved) { return true; }
	              resolved = true;

	              if (value !== val) {
	                resolve(promise, val);
	              } else {
	                fulfill(promise, val);
	              }
	            }, function(val) {
	              if (resolved) { return true; }
	              resolved = true;

	              reject(promise, val);
	            });

	            return true;
	          }
	        }
	      } catch (error) {
	        if (resolved) { return true; }
	        reject(promise, error);
	        return true;
	      }

	      return false;
	    }

	    function resolve(promise, value) {
	      if (promise === value) {
	        fulfill(promise, value);
	      } else if (!handleThenable(promise, value)) {
	        fulfill(promise, value);
	      }
	    }

	    function fulfill(promise, value) {
	      if (promise._state !== PENDING) { return; }
	      promise._state = SEALED;
	      promise._detail = value;

	      config.async(publishFulfillment, promise);
	    }

	    function reject(promise, reason) {
	      if (promise._state !== PENDING) { return; }
	      promise._state = SEALED;
	      promise._detail = reason;

	      config.async(publishRejection, promise);
	    }

	    function publishFulfillment(promise) {
	      publish(promise, promise._state = FULFILLED);
	    }

	    function publishRejection(promise) {
	      publish(promise, promise._state = REJECTED);
	    }

	    __exports__.Promise = Promise;
	  });
	define("promise/race", 
	  ["./utils","exports"],
	  function(__dependency1__, __exports__) {
	    "use strict";
	    /* global toString */
	    var isArray = __dependency1__.isArray;

	    /**
	      `RSVP.race` allows you to watch a series of promises and act as soon as the
	      first promise given to the `promises` argument fulfills or rejects.

	      Example:

	      ```javascript
	      var promise1 = new RSVP.Promise(function(resolve, reject){
	        setTimeout(function(){
	          resolve("promise 1");
	        }, 200);
	      });

	      var promise2 = new RSVP.Promise(function(resolve, reject){
	        setTimeout(function(){
	          resolve("promise 2");
	        }, 100);
	      });

	      RSVP.race([promise1, promise2]).then(function(result){
	        // result === "promise 2" because it was resolved before promise1
	        // was resolved.
	      });
	      ```

	      `RSVP.race` is deterministic in that only the state of the first completed
	      promise matters. For example, even if other promises given to the `promises`
	      array argument are resolved, but the first completed promise has become
	      rejected before the other promises became fulfilled, the returned promise
	      will become rejected:

	      ```javascript
	      var promise1 = new RSVP.Promise(function(resolve, reject){
	        setTimeout(function(){
	          resolve("promise 1");
	        }, 200);
	      });

	      var promise2 = new RSVP.Promise(function(resolve, reject){
	        setTimeout(function(){
	          reject(new Error("promise 2"));
	        }, 100);
	      });

	      RSVP.race([promise1, promise2]).then(function(result){
	        // Code here never runs because there are rejected promises!
	      }, function(reason){
	        // reason.message === "promise2" because promise 2 became rejected before
	        // promise 1 became fulfilled
	      });
	      ```

	      @method race
	      @for RSVP
	      @param {Array} promises array of promises to observe
	      @param {String} label optional string for describing the promise returned.
	      Useful for tooling.
	      @return {Promise} a promise that becomes fulfilled with the value the first
	      completed promises is resolved with if the first completed promise was
	      fulfilled, or rejected with the reason that the first completed promise
	      was rejected with.
	    */
	    function race(promises) {
	      /*jshint validthis:true */
	      var Promise = this;

	      if (!isArray(promises)) {
	        throw new TypeError('You must pass an array to race.');
	      }
	      return new Promise(function(resolve, reject) {
	        var results = [], promise;

	        for (var i = 0; i < promises.length; i++) {
	          promise = promises[i];

	          if (promise && typeof promise.then === 'function') {
	            promise.then(resolve, reject);
	          } else {
	            resolve(promise);
	          }
	        }
	      });
	    }

	    __exports__.race = race;
	  });
	define("promise/reject", 
	  ["exports"],
	  function(__exports__) {
	    "use strict";
	    /**
	      `RSVP.reject` returns a promise that will become rejected with the passed
	      `reason`. `RSVP.reject` is essentially shorthand for the following:

	      ```javascript
	      var promise = new RSVP.Promise(function(resolve, reject){
	        reject(new Error('WHOOPS'));
	      });

	      promise.then(function(value){
	        // Code here doesn't run because the promise is rejected!
	      }, function(reason){
	        // reason.message === 'WHOOPS'
	      });
	      ```

	      Instead of writing the above, your code now simply becomes the following:

	      ```javascript
	      var promise = RSVP.reject(new Error('WHOOPS'));

	      promise.then(function(value){
	        // Code here doesn't run because the promise is rejected!
	      }, function(reason){
	        // reason.message === 'WHOOPS'
	      });
	      ```

	      @method reject
	      @for RSVP
	      @param {Any} reason value that the returned promise will be rejected with.
	      @param {String} label optional string for identifying the returned promise.
	      Useful for tooling.
	      @return {Promise} a promise that will become rejected with the given
	      `reason`.
	    */
	    function reject(reason) {
	      /*jshint validthis:true */
	      var Promise = this;

	      return new Promise(function (resolve, reject) {
	        reject(reason);
	      });
	    }

	    __exports__.reject = reject;
	  });
	define("promise/resolve", 
	  ["exports"],
	  function(__exports__) {
	    "use strict";
	    function resolve(value) {
	      /*jshint validthis:true */
	      if (value && typeof value === 'object' && value.constructor === this) {
	        return value;
	      }

	      var Promise = this;

	      return new Promise(function(resolve) {
	        resolve(value);
	      });
	    }

	    __exports__.resolve = resolve;
	  });
	define("promise/utils", 
	  ["exports"],
	  function(__exports__) {
	    "use strict";
	    function objectOrFunction(x) {
	      return isFunction(x) || (typeof x === "object" && x !== null);
	    }

	    function isFunction(x) {
	      return typeof x === "function";
	    }

	    function isArray(x) {
	      return Object.prototype.toString.call(x) === "[object Array]";
	    }

	    // Date.now is not available in browsers < IE9
	    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
	    var now = Date.now || function() { return new Date().getTime(); };


	    __exports__.objectOrFunction = objectOrFunction;
	    __exports__.isFunction = isFunction;
	    __exports__.isArray = isArray;
	    __exports__.now = now;
	  });
	requireModule('promise/polyfill').polyfill();
	}());(function webpackUniversalModuleDefinition(root, factory) {
		if(true)
			module.exports = factory();
		else if(typeof define === 'function' && define.amd)
			define([], factory);
		else if(typeof exports === 'object')
			exports["localforage"] = factory();
		else
			root["localforage"] = factory();
	})(this, function() {
	return /******/ (function(modules) { // webpackBootstrap
	/******/ 	// The module cache
	/******/ 	var installedModules = {};

	/******/ 	// The require function
	/******/ 	function __webpack_require__(moduleId) {

	/******/ 		// Check if module is in cache
	/******/ 		if(installedModules[moduleId])
	/******/ 			return installedModules[moduleId].exports;

	/******/ 		// Create a new module (and put it into the cache)
	/******/ 		var module = installedModules[moduleId] = {
	/******/ 			exports: {},
	/******/ 			id: moduleId,
	/******/ 			loaded: false
	/******/ 		};

	/******/ 		// Execute the module function
	/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

	/******/ 		// Flag the module as loaded
	/******/ 		module.loaded = true;

	/******/ 		// Return the exports of the module
	/******/ 		return module.exports;
	/******/ 	}


	/******/ 	// expose the modules object (__webpack_modules__)
	/******/ 	__webpack_require__.m = modules;

	/******/ 	// expose the module cache
	/******/ 	__webpack_require__.c = installedModules;

	/******/ 	// __webpack_public_path__
	/******/ 	__webpack_require__.p = "";

	/******/ 	// Load entry module and return exports
	/******/ 	return __webpack_require__(0);
	/******/ })
	/************************************************************************/
	/******/ ([
	/* 0 */
	/***/ function(module, exports, __webpack_require__) {

		'use strict';

		exports.__esModule = true;

		function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

		var localForage = (function (globalObject) {
		    'use strict';

		    // Custom drivers are stored here when `defineDriver()` is called.
		    // They are shared across all instances of localForage.
		    var CustomDrivers = {};

		    var DriverType = {
		        INDEXEDDB: 'asyncStorage',
		        LOCALSTORAGE: 'localStorageWrapper',
		        WEBSQL: 'webSQLStorage'
		    };

		    var DefaultDriverOrder = [DriverType.INDEXEDDB, DriverType.WEBSQL, DriverType.LOCALSTORAGE];

		    var LibraryMethods = ['clear', 'getItem', 'iterate', 'key', 'keys', 'length', 'removeItem', 'setItem'];

		    var DefaultConfig = {
		        description: '',
		        driver: DefaultDriverOrder.slice(),
		        name: 'localforage',
		        // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
		        // we can use without a prompt.
		        size: 4980736,
		        storeName: 'keyvaluepairs',
		        version: 1.0
		    };

		    var driverSupport = (function (self) {
		        var result = {};

		        // Check to see if IndexedDB is available and if it is the latest
		        // implementation; it's our preferred backend library. We use "_spec_test"
		        // as the name of the database because it's not the one we'll operate on,
		        // but it's useful to make sure its using the right spec.
		        // See: https://github.com/mozilla/localForage/issues/128
		        result[DriverType.INDEXEDDB] = !!(function () {
		            try {
		                // Initialize IndexedDB; fall back to vendor-prefixed versions
		                // if needed.
		                var indexedDB = indexedDB || self.indexedDB || self.webkitIndexedDB || self.mozIndexedDB || self.OIndexedDB || self.msIndexedDB;
		                // We mimic PouchDB here; just UA test for Safari (which, as of
		                // iOS 8/Yosemite, doesn't properly support IndexedDB).
		                // IndexedDB support is broken and different from Blink's.
		                // This is faster than the test case (and it's sync), so we just
		                // do this. *SIGH*
		                // http://bl.ocks.org/nolanlawson/raw/c83e9039edf2278047e9/
		                //
		                // We test for openDatabase because IE Mobile identifies itself
		                // as Safari. Oh the lulz...
		                if (typeof self.openDatabase !== 'undefined' && self.navigator && self.navigator.userAgent && /Safari/.test(self.navigator.userAgent) && !/Chrome/.test(self.navigator.userAgent)) {
		                    return false;
		                }

		                return indexedDB && typeof indexedDB.open === 'function' &&
		                // Some Samsung/HTC Android 4.0-4.3 devices
		                // have older IndexedDB specs; if this isn't available
		                // their IndexedDB is too old for us to use.
		                // (Replaces the onupgradeneeded test.)
		                typeof self.IDBKeyRange !== 'undefined';
		            } catch (e) {
		                return false;
		            }
		        })();

		        result[DriverType.WEBSQL] = !!(function () {
		            try {
		                return self.openDatabase;
		            } catch (e) {
		                return false;
		            }
		        })();

		        result[DriverType.LOCALSTORAGE] = !!(function () {
		            try {
		                return self.localStorage && 'setItem' in self.localStorage && self.localStorage.setItem;
		            } catch (e) {
		                return false;
		            }
		        })();

		        return result;
		    })(globalObject);

		    var isArray = Array.isArray || function (arg) {
		        return Object.prototype.toString.call(arg) === '[object Array]';
		    };

		    function callWhenReady(localForageInstance, libraryMethod) {
		        localForageInstance[libraryMethod] = function () {
		            var _args = arguments;
		            return localForageInstance.ready().then(function () {
		                return localForageInstance[libraryMethod].apply(localForageInstance, _args);
		            });
		        };
		    }

		    function extend() {
		        for (var i = 1; i < arguments.length; i++) {
		            var arg = arguments[i];

		            if (arg) {
		                for (var key in arg) {
		                    if (arg.hasOwnProperty(key)) {
		                        if (isArray(arg[key])) {
		                            arguments[0][key] = arg[key].slice();
		                        } else {
		                            arguments[0][key] = arg[key];
		                        }
		                    }
		                }
		            }
		        }

		        return arguments[0];
		    }

		    function isLibraryDriver(driverName) {
		        for (var driver in DriverType) {
		            if (DriverType.hasOwnProperty(driver) && DriverType[driver] === driverName) {
		                return true;
		            }
		        }

		        return false;
		    }

		    var LocalForage = (function () {
		        function LocalForage(options) {
		            _classCallCheck(this, LocalForage);

		            this.INDEXEDDB = DriverType.INDEXEDDB;
		            this.LOCALSTORAGE = DriverType.LOCALSTORAGE;
		            this.WEBSQL = DriverType.WEBSQL;

		            this._defaultConfig = extend({}, DefaultConfig);
		            this._config = extend({}, this._defaultConfig, options);
		            this._driverSet = null;
		            this._initDriver = null;
		            this._ready = false;
		            this._dbInfo = null;

		            this._wrapLibraryMethodsWithReady();
		            this.setDriver(this._config.driver);
		        }

		        // The actual localForage object that we expose as a module or via a
		        // global. It's extended by pulling in one of our other libraries.

		        // Set any config values for localForage; can be called anytime before
		        // the first API call (e.g. `getItem`, `setItem`).
		        // We loop through options so we don't overwrite existing config
		        // values.

		        LocalForage.prototype.config = function config(options) {
		            // If the options argument is an object, we use it to set values.
		            // Otherwise, we return either a specified config value or all
		            // config values.
		            if (typeof options === 'object') {
		                // If localforage is ready and fully initialized, we can't set
		                // any new configuration values. Instead, we return an error.
		                if (this._ready) {
		                    return new Error("Can't call config() after localforage " + 'has been used.');
		                }

		                for (var i in options) {
		                    if (i === 'storeName') {
		                        options[i] = options[i].replace(/\W/g, '_');
		                    }

		                    this._config[i] = options[i];
		                }

		                // after all config options are set and
		                // the driver option is used, try setting it
		                if ('driver' in options && options.driver) {
		                    this.setDriver(this._config.driver);
		                }

		                return true;
		            } else if (typeof options === 'string') {
		                return this._config[options];
		            } else {
		                return this._config;
		            }
		        };

		        // Used to define a custom driver, shared across all instances of
		        // localForage.

		        LocalForage.prototype.defineDriver = function defineDriver(driverObject, callback, errorCallback) {
		            var promise = new Promise(function (resolve, reject) {
		                try {
		                    var driverName = driverObject._driver;
		                    var complianceError = new Error('Custom driver not compliant; see ' + 'https://mozilla.github.io/localForage/#definedriver');
		                    var namingError = new Error('Custom driver name already in use: ' + driverObject._driver);

		                    // A driver name should be defined and not overlap with the
		                    // library-defined, default drivers.
		                    if (!driverObject._driver) {
		                        reject(complianceError);
		                        return;
		                    }
		                    if (isLibraryDriver(driverObject._driver)) {
		                        reject(namingError);
		                        return;
		                    }

		                    var customDriverMethods = LibraryMethods.concat('_initStorage');
		                    for (var i = 0; i < customDriverMethods.length; i++) {
		                        var customDriverMethod = customDriverMethods[i];
		                        if (!customDriverMethod || !driverObject[customDriverMethod] || typeof driverObject[customDriverMethod] !== 'function') {
		                            reject(complianceError);
		                            return;
		                        }
		                    }

		                    var supportPromise = Promise.resolve(true);
		                    if ('_support' in driverObject) {
		                        if (driverObject._support && typeof driverObject._support === 'function') {
		                            supportPromise = driverObject._support();
		                        } else {
		                            supportPromise = Promise.resolve(!!driverObject._support);
		                        }
		                    }

		                    supportPromise.then(function (supportResult) {
		                        driverSupport[driverName] = supportResult;
		                        CustomDrivers[driverName] = driverObject;
		                        resolve();
		                    }, reject);
		                } catch (e) {
		                    reject(e);
		                }
		            });

		            promise.then(callback, errorCallback);
		            return promise;
		        };

		        LocalForage.prototype.driver = function driver() {
		            return this._driver || null;
		        };

		        LocalForage.prototype.getDriver = function getDriver(driverName, callback, errorCallback) {
		            var self = this;
		            var getDriverPromise = (function () {
		                if (isLibraryDriver(driverName)) {
		                    switch (driverName) {
		                        case self.INDEXEDDB:
		                            return new Promise(function (resolve, reject) {
		                                resolve(__webpack_require__(1));
		                            });
		                        case self.LOCALSTORAGE:
		                            return new Promise(function (resolve, reject) {
		                                resolve(__webpack_require__(2));
		                            });
		                        case self.WEBSQL:
		                            return new Promise(function (resolve, reject) {
		                                resolve(__webpack_require__(4));
		                            });
		                    }
		                } else if (CustomDrivers[driverName]) {
		                    return Promise.resolve(CustomDrivers[driverName]);
		                }

		                return Promise.reject(new Error('Driver not found.'));
		            })();

		            getDriverPromise.then(callback, errorCallback);
		            return getDriverPromise;
		        };

		        LocalForage.prototype.getSerializer = function getSerializer(callback) {
		            var serializerPromise = new Promise(function (resolve, reject) {
		                resolve(__webpack_require__(3));
		            });
		            if (callback && typeof callback === 'function') {
		                serializerPromise.then(function (result) {
		                    callback(result);
		                });
		            }
		            return serializerPromise;
		        };

		        LocalForage.prototype.ready = function ready(callback) {
		            var self = this;

		            var promise = self._driverSet.then(function () {
		                if (self._ready === null) {
		                    self._ready = self._initDriver();
		                }

		                return self._ready;
		            });

		            promise.then(callback, callback);
		            return promise;
		        };

		        LocalForage.prototype.setDriver = function setDriver(drivers, callback, errorCallback) {
		            var self = this;

		            if (!isArray(drivers)) {
		                drivers = [drivers];
		            }

		            var supportedDrivers = this._getSupportedDrivers(drivers);

		            function setDriverToConfig() {
		                self._config.driver = self.driver();
		            }

		            function initDriver(supportedDrivers) {
		                return function () {
		                    var currentDriverIndex = 0;

		                    function driverPromiseLoop() {
		                        while (currentDriverIndex < supportedDrivers.length) {
		                            var driverName = supportedDrivers[currentDriverIndex];
		                            currentDriverIndex++;

		                            self._dbInfo = null;
		                            self._ready = null;

		                            return self.getDriver(driverName).then(function (driver) {
		                                self._extend(driver);
		                                setDriverToConfig();

		                                self._ready = self._initStorage(self._config);
		                                return self._ready;
		                            })['catch'](driverPromiseLoop);
		                        }

		                        setDriverToConfig();
		                        var error = new Error('No available storage method found.');
		                        self._driverSet = Promise.reject(error);
		                        return self._driverSet;
		                    }

		                    return driverPromiseLoop();
		                };
		            }

		            // There might be a driver initialization in progress
		            // so wait for it to finish in order to avoid a possible
		            // race condition to set _dbInfo
		            var oldDriverSetDone = this._driverSet !== null ? this._driverSet['catch'](function () {
		                return Promise.resolve();
		            }) : Promise.resolve();

		            this._driverSet = oldDriverSetDone.then(function () {
		                var driverName = supportedDrivers[0];
		                self._dbInfo = null;
		                self._ready = null;

		                return self.getDriver(driverName).then(function (driver) {
		                    self._driver = driver._driver;
		                    setDriverToConfig();
		                    self._wrapLibraryMethodsWithReady();
		                    self._initDriver = initDriver(supportedDrivers);
		                });
		            })['catch'](function () {
		                setDriverToConfig();
		                var error = new Error('No available storage method found.');
		                self._driverSet = Promise.reject(error);
		                return self._driverSet;
		            });

		            this._driverSet.then(callback, errorCallback);
		            return this._driverSet;
		        };

		        LocalForage.prototype.supports = function supports(driverName) {
		            return !!driverSupport[driverName];
		        };

		        LocalForage.prototype._extend = function _extend(libraryMethodsAndProperties) {
		            extend(this, libraryMethodsAndProperties);
		        };

		        LocalForage.prototype._getSupportedDrivers = function _getSupportedDrivers(drivers) {
		            var supportedDrivers = [];
		            for (var i = 0, len = drivers.length; i < len; i++) {
		                var driverName = drivers[i];
		                if (this.supports(driverName)) {
		                    supportedDrivers.push(driverName);
		                }
		            }
		            return supportedDrivers;
		        };

		        LocalForage.prototype._wrapLibraryMethodsWithReady = function _wrapLibraryMethodsWithReady() {
		            // Add a stub for each driver API method that delays the call to the
		            // corresponding driver method until localForage is ready. These stubs
		            // will be replaced by the driver methods as soon as the driver is
		            // loaded, so there is no performance impact.
		            for (var i = 0; i < LibraryMethods.length; i++) {
		                callWhenReady(this, LibraryMethods[i]);
		            }
		        };

		        LocalForage.prototype.createInstance = function createInstance(options) {
		            return new LocalForage(options);
		        };

		        return LocalForage;
		    })();

		    return new LocalForage();
		})(typeof window !== 'undefined' ? window : self);
		exports['default'] = localForage;
		module.exports = exports['default'];

	/***/ },
	/* 1 */
	/***/ function(module, exports) {

		// Some code originally from async_storage.js in
		// [Gaia](https://github.com/mozilla-b2g/gaia).
		'use strict';

		exports.__esModule = true;
		var asyncStorage = (function (globalObject) {
		    'use strict';

		    // Initialize IndexedDB; fall back to vendor-prefixed versions if needed.
		    var indexedDB = indexedDB || globalObject.indexedDB || globalObject.webkitIndexedDB || globalObject.mozIndexedDB || globalObject.OIndexedDB || globalObject.msIndexedDB;

		    // If IndexedDB isn't available, we get outta here!
		    if (!indexedDB) {
		        return;
		    }

		    var DETECT_BLOB_SUPPORT_STORE = 'local-forage-detect-blob-support';
		    var supportsBlobs;
		    var dbContexts;

		    // Abstracts constructing a Blob object, so it also works in older
		    // browsers that don't support the native Blob constructor. (i.e.
		    // old QtWebKit versions, at least).
		    function _createBlob(parts, properties) {
		        parts = parts || [];
		        properties = properties || {};
		        try {
		            return new Blob(parts, properties);
		        } catch (e) {
		            if (e.name !== 'TypeError') {
		                throw e;
		            }
		            var BlobBuilder = globalObject.BlobBuilder || globalObject.MSBlobBuilder || globalObject.MozBlobBuilder || globalObject.WebKitBlobBuilder;
		            var builder = new BlobBuilder();
		            for (var i = 0; i < parts.length; i += 1) {
		                builder.append(parts[i]);
		            }
		            return builder.getBlob(properties.type);
		        }
		    }

		    // Transform a binary string to an array buffer, because otherwise
		    // weird stuff happens when you try to work with the binary string directly.
		    // It is known.
		    // From http://stackoverflow.com/questions/14967647/ (continues on next line)
		    // encode-decode-image-with-base64-breaks-image (2013-04-21)
		    function _binStringToArrayBuffer(bin) {
		        var length = bin.length;
		        var buf = new ArrayBuffer(length);
		        var arr = new Uint8Array(buf);
		        for (var i = 0; i < length; i++) {
		            arr[i] = bin.charCodeAt(i);
		        }
		        return buf;
		    }

		    // Fetch a blob using ajax. This reveals bugs in Chrome < 43.
		    // For details on all this junk:
		    // https://github.com/nolanlawson/state-of-binary-data-in-the-browser#readme
		    function _blobAjax(url) {
		        return new Promise(function (resolve, reject) {
		            var xhr = new XMLHttpRequest();
		            xhr.open('GET', url);
		            xhr.withCredentials = true;
		            xhr.responseType = 'arraybuffer';

		            xhr.onreadystatechange = function () {
		                if (xhr.readyState !== 4) {
		                    return;
		                }
		                if (xhr.status === 200) {
		                    return resolve({
		                        response: xhr.response,
		                        type: xhr.getResponseHeader('Content-Type')
		                    });
		                }
		                reject({ status: xhr.status, response: xhr.response });
		            };
		            xhr.send();
		        });
		    }

		    //
		    // Detect blob support. Chrome didn't support it until version 38.
		    // In version 37 they had a broken version where PNGs (and possibly
		    // other binary types) aren't stored correctly, because when you fetch
		    // them, the content type is always null.
		    //
		    // Furthermore, they have some outstanding bugs where blobs occasionally
		    // are read by FileReader as null, or by ajax as 404s.
		    //
		    // Sadly we use the 404 bug to detect the FileReader bug, so if they
		    // get fixed independently and released in different versions of Chrome,
		    // then the bug could come back. So it's worthwhile to watch these issues:
		    // 404 bug: https://code.google.com/p/chromium/issues/detail?id=447916
		    // FileReader bug: https://code.google.com/p/chromium/issues/detail?id=447836
		    //
		    function _checkBlobSupportWithoutCaching(idb) {
		        return new Promise(function (resolve, reject) {
		            var blob = _createBlob([''], { type: 'image/png' });
		            var txn = idb.transaction([DETECT_BLOB_SUPPORT_STORE], 'readwrite');
		            txn.objectStore(DETECT_BLOB_SUPPORT_STORE).put(blob, 'key');
		            txn.oncomplete = function () {
		                // have to do it in a separate transaction, else the correct
		                // content type is always returned
		                var blobTxn = idb.transaction([DETECT_BLOB_SUPPORT_STORE], 'readwrite');
		                var getBlobReq = blobTxn.objectStore(DETECT_BLOB_SUPPORT_STORE).get('key');
		                getBlobReq.onerror = reject;
		                getBlobReq.onsuccess = function (e) {

		                    var storedBlob = e.target.result;
		                    var url = URL.createObjectURL(storedBlob);

		                    _blobAjax(url).then(function (res) {
		                        resolve(!!(res && res.type === 'image/png'));
		                    }, function () {
		                        resolve(false);
		                    }).then(function () {
		                        URL.revokeObjectURL(url);
		                    });
		                };
		            };
		            txn.onerror = txn.onabort = reject;
		        })['catch'](function () {
		            return false; // error, so assume unsupported
		        });
		    }

		    function _checkBlobSupport(idb) {
		        if (typeof supportsBlobs === 'boolean') {
		            return Promise.resolve(supportsBlobs);
		        }
		        return _checkBlobSupportWithoutCaching(idb).then(function (value) {
		            supportsBlobs = value;
		            return supportsBlobs;
		        });
		    }

		    // encode a blob for indexeddb engines that don't support blobs
		    function _encodeBlob(blob) {
		        return new Promise(function (resolve, reject) {
		            var reader = new FileReader();
		            reader.onerror = reject;
		            reader.onloadend = function (e) {
		                var base64 = btoa(e.target.result || '');
		                resolve({
		                    __local_forage_encoded_blob: true,
		                    data: base64,
		                    type: blob.type
		                });
		            };
		            reader.readAsBinaryString(blob);
		        });
		    }

		    // decode an encoded blob
		    function _decodeBlob(encodedBlob) {
		        var arrayBuff = _binStringToArrayBuffer(atob(encodedBlob.data));
		        return _createBlob([arrayBuff], { type: encodedBlob.type });
		    }

		    // is this one of our fancy encoded blobs?
		    function _isEncodedBlob(value) {
		        return value && value.__local_forage_encoded_blob;
		    }

		    // Specialize the default `ready()` function by making it dependent
		    // on the current database operations. Thus, the driver will be actually
		    // ready when it's been initialized (default) *and* there are no pending
		    // operations on the database (initiated by some other instances).
		    function _fullyReady(callback) {
		        var self = this;

		        var promise = self._initReady().then(function () {
		            var dbContext = dbContexts[self._dbInfo.name];

		            if (dbContext && dbContext.dbReady) {
		                return dbContext.dbReady;
		            }
		        });

		        promise.then(callback, callback);
		        return promise;
		    }

		    function _deferReadiness(dbInfo) {
		        var dbContext = dbContexts[dbInfo.name];

		        // Create a deferred object representing the current database operation.
		        var deferredOperation = {};

		        deferredOperation.promise = new Promise(function (resolve) {
		            deferredOperation.resolve = resolve;
		        });

		        // Enqueue the deferred operation.
		        dbContext.deferredOperations.push(deferredOperation);

		        // Chain its promise to the database readiness.
		        if (!dbContext.dbReady) {
		            dbContext.dbReady = deferredOperation.promise;
		        } else {
		            dbContext.dbReady = dbContext.dbReady.then(function () {
		                return deferredOperation.promise;
		            });
		        }
		    }

		    function _advanceReadiness(dbInfo) {
		        var dbContext = dbContexts[dbInfo.name];

		        // Dequeue a deferred operation.
		        var deferredOperation = dbContext.deferredOperations.pop();

		        // Resolve its promise (which is part of the database readiness
		        // chain of promises).
		        if (deferredOperation) {
		            deferredOperation.resolve();
		        }
		    }

		    // Open the IndexedDB database (automatically creates one if one didn't
		    // previously exist), using any options set in the config.
		    function _initStorage(options) {
		        var self = this;
		        var dbInfo = {
		            db: null
		        };

		        if (options) {
		            for (var i in options) {
		                dbInfo[i] = options[i];
		            }
		        }

		        // Initialize a singleton container for all running localForages.
		        if (!dbContexts) {
		            dbContexts = {};
		        }

		        // Get the current context of the database;
		        var dbContext = dbContexts[dbInfo.name];

		        // ...or create a new context.
		        if (!dbContext) {
		            dbContext = {
		                // Running localForages sharing a database.
		                forages: [],
		                // Shared database.
		                db: null,
		                // Database readiness (promise).
		                dbReady: null,
		                // Deferred operations on the database.
		                deferredOperations: []
		            };
		            // Register the new context in the global container.
		            dbContexts[dbInfo.name] = dbContext;
		        }

		        // Register itself as a running localForage in the current context.
		        dbContext.forages.push(self);

		        // Replace the default `ready()` function with the specialized one.
		        if (!self._initReady) {
		            self._initReady = self.ready;
		            self.ready = _fullyReady;
		        }

		        // Create an array of initialization states of the related localForages.
		        var initPromises = [];

		        function ignoreErrors() {
		            // Don't handle errors here,
		            // just makes sure related localForages aren't pending.
		            return Promise.resolve();
		        }

		        for (var j = 0; j < dbContext.forages.length; j++) {
		            var forage = dbContext.forages[j];
		            if (forage !== self) {
		                // Don't wait for itself...
		                initPromises.push(forage._initReady()['catch'](ignoreErrors));
		            }
		        }

		        // Take a snapshot of the related localForages.
		        var forages = dbContext.forages.slice(0);

		        // Initialize the connection process only when
		        // all the related localForages aren't pending.
		        return Promise.all(initPromises).then(function () {
		            dbInfo.db = dbContext.db;
		            // Get the connection or open a new one without upgrade.
		            return _getOriginalConnection(dbInfo);
		        }).then(function (db) {
		            dbInfo.db = db;
		            if (_isUpgradeNeeded(dbInfo, self._defaultConfig.version)) {
		                // Reopen the database for upgrading.
		                return _getUpgradedConnection(dbInfo);
		            }
		            return db;
		        }).then(function (db) {
		            dbInfo.db = dbContext.db = db;
		            self._dbInfo = dbInfo;
		            // Share the final connection amongst related localForages.
		            for (var k = 0; k < forages.length; k++) {
		                var forage = forages[k];
		                if (forage !== self) {
		                    // Self is already up-to-date.
		                    forage._dbInfo.db = dbInfo.db;
		                    forage._dbInfo.version = dbInfo.version;
		                }
		            }
		        });
		    }

		    function _getOriginalConnection(dbInfo) {
		        return _getConnection(dbInfo, false);
		    }

		    function _getUpgradedConnection(dbInfo) {
		        return _getConnection(dbInfo, true);
		    }

		    function _getConnection(dbInfo, upgradeNeeded) {
		        return new Promise(function (resolve, reject) {

		            if (dbInfo.db) {
		                if (upgradeNeeded) {
		                    _deferReadiness(dbInfo);
		                    dbInfo.db.close();
		                } else {
		                    return resolve(dbInfo.db);
		                }
		            }

		            var dbArgs = [dbInfo.name];

		            if (upgradeNeeded) {
		                dbArgs.push(dbInfo.version);
		            }

		            var openreq = indexedDB.open.apply(indexedDB, dbArgs);

		            if (upgradeNeeded) {
		                openreq.onupgradeneeded = function (e) {
		                    var db = openreq.result;
		                    try {
		                        db.createObjectStore(dbInfo.storeName);
		                        if (e.oldVersion <= 1) {
		                            // Added when support for blob shims was added
		                            db.createObjectStore(DETECT_BLOB_SUPPORT_STORE);
		                        }
		                    } catch (ex) {
		                        if (ex.name === 'ConstraintError') {
		                            globalObject.console.warn('The database "' + dbInfo.name + '"' + ' has been upgraded from version ' + e.oldVersion + ' to version ' + e.newVersion + ', but the storage "' + dbInfo.storeName + '" already exists.');
		                        } else {
		                            throw ex;
		                        }
		                    }
		                };
		            }

		            openreq.onerror = function () {
		                reject(openreq.error);
		            };

		            openreq.onsuccess = function () {
		                resolve(openreq.result);
		                _advanceReadiness(dbInfo);
		            };
		        });
		    }

		    function _isUpgradeNeeded(dbInfo, defaultVersion) {
		        if (!dbInfo.db) {
		            return true;
		        }

		        var isNewStore = !dbInfo.db.objectStoreNames.contains(dbInfo.storeName);
		        var isDowngrade = dbInfo.version < dbInfo.db.version;
		        var isUpgrade = dbInfo.version > dbInfo.db.version;

		        if (isDowngrade) {
		            // If the version is not the default one
		            // then warn for impossible downgrade.
		            if (dbInfo.version !== defaultVersion) {
		                globalObject.console.warn('The database "' + dbInfo.name + '"' + ' can\'t be downgraded from version ' + dbInfo.db.version + ' to version ' + dbInfo.version + '.');
		            }
		            // Align the versions to prevent errors.
		            dbInfo.version = dbInfo.db.version;
		        }

		        if (isUpgrade || isNewStore) {
		            // If the store is new then increment the version (if needed).
		            // This will trigger an "upgradeneeded" event which is required
		            // for creating a store.
		            if (isNewStore) {
		                var incVersion = dbInfo.db.version + 1;
		                if (incVersion > dbInfo.version) {
		                    dbInfo.version = incVersion;
		                }
		            }

		            return true;
		        }

		        return false;
		    }

		    function getItem(key, callback) {
		        var self = this;

		        // Cast the key to a string, as that's all we can set as a key.
		        if (typeof key !== 'string') {
		            globalObject.console.warn(key + ' used as a key, but it is not a string.');
		            key = String(key);
		        }

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);
		                var req = store.get(key);

		                req.onsuccess = function () {
		                    var value = req.result;
		                    if (value === undefined) {
		                        value = null;
		                    }
		                    if (_isEncodedBlob(value)) {
		                        value = _decodeBlob(value);
		                    }
		                    resolve(value);
		                };

		                req.onerror = function () {
		                    reject(req.error);
		                };
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Iterate over all items stored in database.
		    function iterate(iterator, callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

		                var req = store.openCursor();
		                var iterationNumber = 1;

		                req.onsuccess = function () {
		                    var cursor = req.result;

		                    if (cursor) {
		                        var value = cursor.value;
		                        if (_isEncodedBlob(value)) {
		                            value = _decodeBlob(value);
		                        }
		                        var result = iterator(value, cursor.key, iterationNumber++);

		                        if (result !== void 0) {
		                            resolve(result);
		                        } else {
		                            cursor['continue']();
		                        }
		                    } else {
		                        resolve();
		                    }
		                };

		                req.onerror = function () {
		                    reject(req.error);
		                };
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);

		        return promise;
		    }

		    function setItem(key, value, callback) {
		        var self = this;

		        // Cast the key to a string, as that's all we can set as a key.
		        if (typeof key !== 'string') {
		            globalObject.console.warn(key + ' used as a key, but it is not a string.');
		            key = String(key);
		        }

		        var promise = new Promise(function (resolve, reject) {
		            var dbInfo;
		            self.ready().then(function () {
		                dbInfo = self._dbInfo;
		                if (value instanceof Blob) {
		                    return _checkBlobSupport(dbInfo.db).then(function (blobSupport) {
		                        if (blobSupport) {
		                            return value;
		                        }
		                        return _encodeBlob(value);
		                    });
		                }
		                return value;
		            }).then(function (value) {
		                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
		                var store = transaction.objectStore(dbInfo.storeName);

		                // The reason we don't _save_ null is because IE 10 does
		                // not support saving the `null` type in IndexedDB. How
		                // ironic, given the bug below!
		                // See: https://github.com/mozilla/localForage/issues/161
		                if (value === null) {
		                    value = undefined;
		                }

		                transaction.oncomplete = function () {
		                    // Cast to undefined so the value passed to
		                    // callback/promise is the same as what one would get out
		                    // of `getItem()` later. This leads to some weirdness
		                    // (setItem('foo', undefined) will return `null`), but
		                    // it's not my fault localStorage is our baseline and that
		                    // it's weird.
		                    if (value === undefined) {
		                        value = null;
		                    }

		                    resolve(value);
		                };
		                transaction.onabort = transaction.onerror = function () {
		                    var err = req.error ? req.error : req.transaction.error;
		                    reject(err);
		                };

		                var req = store.put(value, key);
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function removeItem(key, callback) {
		        var self = this;

		        // Cast the key to a string, as that's all we can set as a key.
		        if (typeof key !== 'string') {
		            globalObject.console.warn(key + ' used as a key, but it is not a string.');
		            key = String(key);
		        }

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
		                var store = transaction.objectStore(dbInfo.storeName);

		                // We use a Grunt task to make this safe for IE and some
		                // versions of Android (including those used by Cordova).
		                // Normally IE won't like `.delete()` and will insist on
		                // using `['delete']()`, but we have a build step that
		                // fixes this for us now.
		                var req = store['delete'](key);
		                transaction.oncomplete = function () {
		                    resolve();
		                };

		                transaction.onerror = function () {
		                    reject(req.error);
		                };

		                // The request will be also be aborted if we've exceeded our storage
		                // space.
		                transaction.onabort = function () {
		                    var err = req.error ? req.error : req.transaction.error;
		                    reject(err);
		                };
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function clear(callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                var transaction = dbInfo.db.transaction(dbInfo.storeName, 'readwrite');
		                var store = transaction.objectStore(dbInfo.storeName);
		                var req = store.clear();

		                transaction.oncomplete = function () {
		                    resolve();
		                };

		                transaction.onabort = transaction.onerror = function () {
		                    var err = req.error ? req.error : req.transaction.error;
		                    reject(err);
		                };
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function length(callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);
		                var req = store.count();

		                req.onsuccess = function () {
		                    resolve(req.result);
		                };

		                req.onerror = function () {
		                    reject(req.error);
		                };
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function key(n, callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            if (n < 0) {
		                resolve(null);

		                return;
		            }

		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

		                var advanced = false;
		                var req = store.openCursor();
		                req.onsuccess = function () {
		                    var cursor = req.result;
		                    if (!cursor) {
		                        // this means there weren't enough keys
		                        resolve(null);

		                        return;
		                    }

		                    if (n === 0) {
		                        // We have the first key, return it if that's what they
		                        // wanted.
		                        resolve(cursor.key);
		                    } else {
		                        if (!advanced) {
		                            // Otherwise, ask the cursor to skip ahead n
		                            // records.
		                            advanced = true;
		                            cursor.advance(n);
		                        } else {
		                            // When we get here, we've got the nth key.
		                            resolve(cursor.key);
		                        }
		                    }
		                };

		                req.onerror = function () {
		                    reject(req.error);
		                };
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function keys(callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly').objectStore(dbInfo.storeName);

		                var req = store.openCursor();
		                var keys = [];

		                req.onsuccess = function () {
		                    var cursor = req.result;

		                    if (!cursor) {
		                        resolve(keys);
		                        return;
		                    }

		                    keys.push(cursor.key);
		                    cursor['continue']();
		                };

		                req.onerror = function () {
		                    reject(req.error);
		                };
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function executeCallback(promise, callback) {
		        if (callback) {
		            promise.then(function (result) {
		                callback(null, result);
		            }, function (error) {
		                callback(error);
		            });
		        }
		    }

		    var asyncStorage = {
		        _driver: 'asyncStorage',
		        _initStorage: _initStorage,
		        iterate: iterate,
		        getItem: getItem,
		        setItem: setItem,
		        removeItem: removeItem,
		        clear: clear,
		        length: length,
		        key: key,
		        keys: keys
		    };

		    return asyncStorage;
		})(typeof window !== 'undefined' ? window : self);
		exports['default'] = asyncStorage;
		module.exports = exports['default'];

	/***/ },
	/* 2 */
	/***/ function(module, exports, __webpack_require__) {

		// If IndexedDB isn't available, we'll fall back to localStorage.
		// Note that this will have considerable performance and storage
		// side-effects (all data will be serialized on save and only data that
		// can be converted to a string via `JSON.stringify()` will be saved).
		'use strict';

		exports.__esModule = true;
		var localStorageWrapper = (function (globalObject) {
		    'use strict';

		    var localStorage = null;

		    // If the app is running inside a Google Chrome packaged webapp, or some
		    // other context where localStorage isn't available, we don't use
		    // localStorage. This feature detection is preferred over the old
		    // `if (window.chrome && window.chrome.runtime)` code.
		    // See: https://github.com/mozilla/localForage/issues/68
		    try {
		        // If localStorage isn't available, we get outta here!
		        // This should be inside a try catch
		        if (!globalObject.localStorage || !('setItem' in globalObject.localStorage)) {
		            return;
		        }
		        // Initialize localStorage and create a variable to use throughout
		        // the code.
		        localStorage = globalObject.localStorage;
		    } catch (e) {
		        return;
		    }

		    // Config the localStorage backend, using options set in the config.
		    function _initStorage(options) {
		        var self = this;
		        var dbInfo = {};
		        if (options) {
		            for (var i in options) {
		                dbInfo[i] = options[i];
		            }
		        }

		        dbInfo.keyPrefix = dbInfo.name + '/';

		        if (dbInfo.storeName !== self._defaultConfig.storeName) {
		            dbInfo.keyPrefix += dbInfo.storeName + '/';
		        }

		        self._dbInfo = dbInfo;

		        return new Promise(function (resolve, reject) {
		            resolve(__webpack_require__(3));
		        }).then(function (lib) {
		            dbInfo.serializer = lib;
		            return Promise.resolve();
		        });
		    }

		    // Remove all keys from the datastore, effectively destroying all data in
		    // the app's key/value store!
		    function clear(callback) {
		        var self = this;
		        var promise = self.ready().then(function () {
		            var keyPrefix = self._dbInfo.keyPrefix;

		            for (var i = localStorage.length - 1; i >= 0; i--) {
		                var key = localStorage.key(i);

		                if (key.indexOf(keyPrefix) === 0) {
		                    localStorage.removeItem(key);
		                }
		            }
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Retrieve an item from the store. Unlike the original async_storage
		    // library in Gaia, we don't modify return values at all. If a key's value
		    // is `undefined`, we pass that value to the callback function.
		    function getItem(key, callback) {
		        var self = this;

		        // Cast the key to a string, as that's all we can set as a key.
		        if (typeof key !== 'string') {
		            globalObject.console.warn(key + ' used as a key, but it is not a string.');
		            key = String(key);
		        }

		        var promise = self.ready().then(function () {
		            var dbInfo = self._dbInfo;
		            var result = localStorage.getItem(dbInfo.keyPrefix + key);

		            // If a result was found, parse it from the serialized
		            // string into a JS object. If result isn't truthy, the key
		            // is likely undefined and we'll pass it straight to the
		            // callback.
		            if (result) {
		                result = dbInfo.serializer.deserialize(result);
		            }

		            return result;
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Iterate over all items in the store.
		    function iterate(iterator, callback) {
		        var self = this;

		        var promise = self.ready().then(function () {
		            var dbInfo = self._dbInfo;
		            var keyPrefix = dbInfo.keyPrefix;
		            var keyPrefixLength = keyPrefix.length;
		            var length = localStorage.length;

		            // We use a dedicated iterator instead of the `i` variable below
		            // so other keys we fetch in localStorage aren't counted in
		            // the `iterationNumber` argument passed to the `iterate()`
		            // callback.
		            //
		            // See: github.com/mozilla/localForage/pull/435#discussion_r38061530
		            var iterationNumber = 1;

		            for (var i = 0; i < length; i++) {
		                var key = localStorage.key(i);
		                if (key.indexOf(keyPrefix) !== 0) {
		                    continue;
		                }
		                var value = localStorage.getItem(key);

		                // If a result was found, parse it from the serialized
		                // string into a JS object. If result isn't truthy, the
		                // key is likely undefined and we'll pass it straight
		                // to the iterator.
		                if (value) {
		                    value = dbInfo.serializer.deserialize(value);
		                }

		                value = iterator(value, key.substring(keyPrefixLength), iterationNumber++);

		                if (value !== void 0) {
		                    return value;
		                }
		            }
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Same as localStorage's key() method, except takes a callback.
		    function key(n, callback) {
		        var self = this;
		        var promise = self.ready().then(function () {
		            var dbInfo = self._dbInfo;
		            var result;
		            try {
		                result = localStorage.key(n);
		            } catch (error) {
		                result = null;
		            }

		            // Remove the prefix from the key, if a key is found.
		            if (result) {
		                result = result.substring(dbInfo.keyPrefix.length);
		            }

		            return result;
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function keys(callback) {
		        var self = this;
		        var promise = self.ready().then(function () {
		            var dbInfo = self._dbInfo;
		            var length = localStorage.length;
		            var keys = [];

		            for (var i = 0; i < length; i++) {
		                if (localStorage.key(i).indexOf(dbInfo.keyPrefix) === 0) {
		                    keys.push(localStorage.key(i).substring(dbInfo.keyPrefix.length));
		                }
		            }

		            return keys;
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Supply the number of keys in the datastore to the callback function.
		    function length(callback) {
		        var self = this;
		        var promise = self.keys().then(function (keys) {
		            return keys.length;
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Remove an item from the store, nice and simple.
		    function removeItem(key, callback) {
		        var self = this;

		        // Cast the key to a string, as that's all we can set as a key.
		        if (typeof key !== 'string') {
		            globalObject.console.warn(key + ' used as a key, but it is not a string.');
		            key = String(key);
		        }

		        var promise = self.ready().then(function () {
		            var dbInfo = self._dbInfo;
		            localStorage.removeItem(dbInfo.keyPrefix + key);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Set a key's value and run an optional callback once the value is set.
		    // Unlike Gaia's implementation, the callback function is passed the value,
		    // in case you want to operate on that value only after you're sure it
		    // saved, or something like that.
		    function setItem(key, value, callback) {
		        var self = this;

		        // Cast the key to a string, as that's all we can set as a key.
		        if (typeof key !== 'string') {
		            globalObject.console.warn(key + ' used as a key, but it is not a string.');
		            key = String(key);
		        }

		        var promise = self.ready().then(function () {
		            // Convert undefined values to null.
		            // https://github.com/mozilla/localForage/pull/42
		            if (value === undefined) {
		                value = null;
		            }

		            // Save the original value to pass to the callback.
		            var originalValue = value;

		            return new Promise(function (resolve, reject) {
		                var dbInfo = self._dbInfo;
		                dbInfo.serializer.serialize(value, function (value, error) {
		                    if (error) {
		                        reject(error);
		                    } else {
		                        try {
		                            localStorage.setItem(dbInfo.keyPrefix + key, value);
		                            resolve(originalValue);
		                        } catch (e) {
		                            // localStorage capacity exceeded.
		                            // TODO: Make this a specific error/event.
		                            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
		                                reject(e);
		                            }
		                            reject(e);
		                        }
		                    }
		                });
		            });
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function executeCallback(promise, callback) {
		        if (callback) {
		            promise.then(function (result) {
		                callback(null, result);
		            }, function (error) {
		                callback(error);
		            });
		        }
		    }

		    var localStorageWrapper = {
		        _driver: 'localStorageWrapper',
		        _initStorage: _initStorage,
		        // Default API, from Gaia/localStorage.
		        iterate: iterate,
		        getItem: getItem,
		        setItem: setItem,
		        removeItem: removeItem,
		        clear: clear,
		        length: length,
		        key: key,
		        keys: keys
		    };

		    return localStorageWrapper;
		})(typeof window !== 'undefined' ? window : self);
		exports['default'] = localStorageWrapper;
		module.exports = exports['default'];

	/***/ },
	/* 3 */
	/***/ function(module, exports) {

		'use strict';

		exports.__esModule = true;
		var localforageSerializer = (function (globalObject) {
		    'use strict';

		    // Sadly, the best way to save binary data in WebSQL/localStorage is serializing
		    // it to Base64, so this is how we store it to prevent very strange errors with less
		    // verbose ways of binary <-> string data storage.
		    var BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

		    var BLOB_TYPE_PREFIX = '~~local_forage_type~';
		    var BLOB_TYPE_PREFIX_REGEX = /^~~local_forage_type~([^~]+)~/;

		    var SERIALIZED_MARKER = '__lfsc__:';
		    var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

		    // OMG the serializations!
		    var TYPE_ARRAYBUFFER = 'arbf';
		    var TYPE_BLOB = 'blob';
		    var TYPE_INT8ARRAY = 'si08';
		    var TYPE_UINT8ARRAY = 'ui08';
		    var TYPE_UINT8CLAMPEDARRAY = 'uic8';
		    var TYPE_INT16ARRAY = 'si16';
		    var TYPE_INT32ARRAY = 'si32';
		    var TYPE_UINT16ARRAY = 'ur16';
		    var TYPE_UINT32ARRAY = 'ui32';
		    var TYPE_FLOAT32ARRAY = 'fl32';
		    var TYPE_FLOAT64ARRAY = 'fl64';
		    var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH + TYPE_ARRAYBUFFER.length;

		    // Abstracts constructing a Blob object, so it also works in older
		    // browsers that don't support the native Blob constructor. (i.e.
		    // old QtWebKit versions, at least).
		    function _createBlob(parts, properties) {
		        parts = parts || [];
		        properties = properties || {};

		        try {
		            return new Blob(parts, properties);
		        } catch (err) {
		            if (err.name !== 'TypeError') {
		                throw err;
		            }

		            var BlobBuilder = globalObject.BlobBuilder || globalObject.MSBlobBuilder || globalObject.MozBlobBuilder || globalObject.WebKitBlobBuilder;

		            var builder = new BlobBuilder();
		            for (var i = 0; i < parts.length; i += 1) {
		                builder.append(parts[i]);
		            }

		            return builder.getBlob(properties.type);
		        }
		    }

		    // Serialize a value, afterwards executing a callback (which usually
		    // instructs the `setItem()` callback/promise to be executed). This is how
		    // we store binary data with localStorage.
		    function serialize(value, callback) {
		        var valueString = '';
		        if (value) {
		            valueString = value.toString();
		        }

		        // Cannot use `value instanceof ArrayBuffer` or such here, as these
		        // checks fail when running the tests using casper.js...
		        //
		        // TODO: See why those tests fail and use a better solution.
		        if (value && (value.toString() === '[object ArrayBuffer]' || value.buffer && value.buffer.toString() === '[object ArrayBuffer]')) {
		            // Convert binary arrays to a string and prefix the string with
		            // a special marker.
		            var buffer;
		            var marker = SERIALIZED_MARKER;

		            if (value instanceof ArrayBuffer) {
		                buffer = value;
		                marker += TYPE_ARRAYBUFFER;
		            } else {
		                buffer = value.buffer;

		                if (valueString === '[object Int8Array]') {
		                    marker += TYPE_INT8ARRAY;
		                } else if (valueString === '[object Uint8Array]') {
		                    marker += TYPE_UINT8ARRAY;
		                } else if (valueString === '[object Uint8ClampedArray]') {
		                    marker += TYPE_UINT8CLAMPEDARRAY;
		                } else if (valueString === '[object Int16Array]') {
		                    marker += TYPE_INT16ARRAY;
		                } else if (valueString === '[object Uint16Array]') {
		                    marker += TYPE_UINT16ARRAY;
		                } else if (valueString === '[object Int32Array]') {
		                    marker += TYPE_INT32ARRAY;
		                } else if (valueString === '[object Uint32Array]') {
		                    marker += TYPE_UINT32ARRAY;
		                } else if (valueString === '[object Float32Array]') {
		                    marker += TYPE_FLOAT32ARRAY;
		                } else if (valueString === '[object Float64Array]') {
		                    marker += TYPE_FLOAT64ARRAY;
		                } else {
		                    callback(new Error('Failed to get type for BinaryArray'));
		                }
		            }

		            callback(marker + bufferToString(buffer));
		        } else if (valueString === '[object Blob]') {
		            // Conver the blob to a binaryArray and then to a string.
		            var fileReader = new FileReader();

		            fileReader.onload = function () {
		                // Backwards-compatible prefix for the blob type.
		                var str = BLOB_TYPE_PREFIX + value.type + '~' + bufferToString(this.result);

		                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
		            };

		            fileReader.readAsArrayBuffer(value);
		        } else {
		            try {
		                callback(JSON.stringify(value));
		            } catch (e) {
		                console.error("Couldn't convert value into a JSON string: ", value);

		                callback(null, e);
		            }
		        }
		    }

		    // Deserialize data we've inserted into a value column/field. We place
		    // special markers into our strings to mark them as encoded; this isn't
		    // as nice as a meta field, but it's the only sane thing we can do whilst
		    // keeping localStorage support intact.
		    //
		    // Oftentimes this will just deserialize JSON content, but if we have a
		    // special marker (SERIALIZED_MARKER, defined above), we will extract
		    // some kind of arraybuffer/binary data/typed array out of the string.
		    function deserialize(value) {
		        // If we haven't marked this string as being specially serialized (i.e.
		        // something other than serialized JSON), we can just return it and be
		        // done with it.
		        if (value.substring(0, SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
		            return JSON.parse(value);
		        }

		        // The following code deals with deserializing some kind of Blob or
		        // TypedArray. First we separate out the type of data we're dealing
		        // with from the data itself.
		        var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
		        var type = value.substring(SERIALIZED_MARKER_LENGTH, TYPE_SERIALIZED_MARKER_LENGTH);

		        var blobType;
		        // Backwards-compatible blob type serialization strategy.
		        // DBs created with older versions of localForage will simply not have the blob type.
		        if (type === TYPE_BLOB && BLOB_TYPE_PREFIX_REGEX.test(serializedString)) {
		            var matcher = serializedString.match(BLOB_TYPE_PREFIX_REGEX);
		            blobType = matcher[1];
		            serializedString = serializedString.substring(matcher[0].length);
		        }
		        var buffer = stringToBuffer(serializedString);

		        // Return the right type based on the code/type set during
		        // serialization.
		        switch (type) {
		            case TYPE_ARRAYBUFFER:
		                return buffer;
		            case TYPE_BLOB:
		                return _createBlob([buffer], { type: blobType });
		            case TYPE_INT8ARRAY:
		                return new Int8Array(buffer);
		            case TYPE_UINT8ARRAY:
		                return new Uint8Array(buffer);
		            case TYPE_UINT8CLAMPEDARRAY:
		                return new Uint8ClampedArray(buffer);
		            case TYPE_INT16ARRAY:
		                return new Int16Array(buffer);
		            case TYPE_UINT16ARRAY:
		                return new Uint16Array(buffer);
		            case TYPE_INT32ARRAY:
		                return new Int32Array(buffer);
		            case TYPE_UINT32ARRAY:
		                return new Uint32Array(buffer);
		            case TYPE_FLOAT32ARRAY:
		                return new Float32Array(buffer);
		            case TYPE_FLOAT64ARRAY:
		                return new Float64Array(buffer);
		            default:
		                throw new Error('Unkown type: ' + type);
		        }
		    }

		    function stringToBuffer(serializedString) {
		        // Fill the string into a ArrayBuffer.
		        var bufferLength = serializedString.length * 0.75;
		        var len = serializedString.length;
		        var i;
		        var p = 0;
		        var encoded1, encoded2, encoded3, encoded4;

		        if (serializedString[serializedString.length - 1] === '=') {
		            bufferLength--;
		            if (serializedString[serializedString.length - 2] === '=') {
		                bufferLength--;
		            }
		        }

		        var buffer = new ArrayBuffer(bufferLength);
		        var bytes = new Uint8Array(buffer);

		        for (i = 0; i < len; i += 4) {
		            encoded1 = BASE_CHARS.indexOf(serializedString[i]);
		            encoded2 = BASE_CHARS.indexOf(serializedString[i + 1]);
		            encoded3 = BASE_CHARS.indexOf(serializedString[i + 2]);
		            encoded4 = BASE_CHARS.indexOf(serializedString[i + 3]);

		            /*jslint bitwise: true */
		            bytes[p++] = encoded1 << 2 | encoded2 >> 4;
		            bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
		            bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
		        }
		        return buffer;
		    }

		    // Converts a buffer to a string to store, serialized, in the backend
		    // storage library.
		    function bufferToString(buffer) {
		        // base64-arraybuffer
		        var bytes = new Uint8Array(buffer);
		        var base64String = '';
		        var i;

		        for (i = 0; i < bytes.length; i += 3) {
		            /*jslint bitwise: true */
		            base64String += BASE_CHARS[bytes[i] >> 2];
		            base64String += BASE_CHARS[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
		            base64String += BASE_CHARS[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
		            base64String += BASE_CHARS[bytes[i + 2] & 63];
		        }

		        if (bytes.length % 3 === 2) {
		            base64String = base64String.substring(0, base64String.length - 1) + '=';
		        } else if (bytes.length % 3 === 1) {
		            base64String = base64String.substring(0, base64String.length - 2) + '==';
		        }

		        return base64String;
		    }

		    var localforageSerializer = {
		        serialize: serialize,
		        deserialize: deserialize,
		        stringToBuffer: stringToBuffer,
		        bufferToString: bufferToString
		    };

		    return localforageSerializer;
		})(typeof window !== 'undefined' ? window : self);
		exports['default'] = localforageSerializer;
		module.exports = exports['default'];

	/***/ },
	/* 4 */
	/***/ function(module, exports, __webpack_require__) {

		/*
		 * Includes code from:
		 *
		 * base64-arraybuffer
		 * https://github.com/niklasvh/base64-arraybuffer
		 *
		 * Copyright (c) 2012 Niklas von Hertzen
		 * Licensed under the MIT license.
		 */
		'use strict';

		exports.__esModule = true;
		var webSQLStorage = (function (globalObject) {
		    'use strict';

		    var openDatabase = globalObject.openDatabase;

		    // If WebSQL methods aren't available, we can stop now.
		    if (!openDatabase) {
		        return;
		    }

		    // Open the WebSQL database (automatically creates one if one didn't
		    // previously exist), using any options set in the config.
		    function _initStorage(options) {
		        var self = this;
		        var dbInfo = {
		            db: null
		        };

		        if (options) {
		            for (var i in options) {
		                dbInfo[i] = typeof options[i] !== 'string' ? options[i].toString() : options[i];
		            }
		        }

		        var dbInfoPromise = new Promise(function (resolve, reject) {
		            // Open the database; the openDatabase API will automatically
		            // create it for us if it doesn't exist.
		            try {
		                dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version), dbInfo.description, dbInfo.size);
		            } catch (e) {
		                return reject(e);
		            }

		            // Create our key/value table if it doesn't exist.
		            dbInfo.db.transaction(function (t) {
		                t.executeSql('CREATE TABLE IF NOT EXISTS ' + dbInfo.storeName + ' (id INTEGER PRIMARY KEY, key unique, value)', [], function () {
		                    self._dbInfo = dbInfo;
		                    resolve();
		                }, function (t, error) {
		                    reject(error);
		                });
		            });
		        });

		        return new Promise(function (resolve, reject) {
		            resolve(__webpack_require__(3));
		        }).then(function (lib) {
		            dbInfo.serializer = lib;
		            return dbInfoPromise;
		        });
		    }

		    function getItem(key, callback) {
		        var self = this;

		        // Cast the key to a string, as that's all we can set as a key.
		        if (typeof key !== 'string') {
		            globalObject.console.warn(key + ' used as a key, but it is not a string.');
		            key = String(key);
		        }

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                dbInfo.db.transaction(function (t) {
		                    t.executeSql('SELECT * FROM ' + dbInfo.storeName + ' WHERE key = ? LIMIT 1', [key], function (t, results) {
		                        var result = results.rows.length ? results.rows.item(0).value : null;

		                        // Check to see if this is serialized content we need to
		                        // unpack.
		                        if (result) {
		                            result = dbInfo.serializer.deserialize(result);
		                        }

		                        resolve(result);
		                    }, function (t, error) {

		                        reject(error);
		                    });
		                });
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function iterate(iterator, callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;

		                dbInfo.db.transaction(function (t) {
		                    t.executeSql('SELECT * FROM ' + dbInfo.storeName, [], function (t, results) {
		                        var rows = results.rows;
		                        var length = rows.length;

		                        for (var i = 0; i < length; i++) {
		                            var item = rows.item(i);
		                            var result = item.value;

		                            // Check to see if this is serialized content
		                            // we need to unpack.
		                            if (result) {
		                                result = dbInfo.serializer.deserialize(result);
		                            }

		                            result = iterator(result, item.key, i + 1);

		                            // void(0) prevents problems with redefinition
		                            // of `undefined`.
		                            if (result !== void 0) {
		                                resolve(result);
		                                return;
		                            }
		                        }

		                        resolve();
		                    }, function (t, error) {
		                        reject(error);
		                    });
		                });
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function setItem(key, value, callback) {
		        var self = this;

		        // Cast the key to a string, as that's all we can set as a key.
		        if (typeof key !== 'string') {
		            globalObject.console.warn(key + ' used as a key, but it is not a string.');
		            key = String(key);
		        }

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                // The localStorage API doesn't return undefined values in an
		                // "expected" way, so undefined is always cast to null in all
		                // drivers. See: https://github.com/mozilla/localForage/pull/42
		                if (value === undefined) {
		                    value = null;
		                }

		                // Save the original value to pass to the callback.
		                var originalValue = value;

		                var dbInfo = self._dbInfo;
		                dbInfo.serializer.serialize(value, function (value, error) {
		                    if (error) {
		                        reject(error);
		                    } else {
		                        dbInfo.db.transaction(function (t) {
		                            t.executeSql('INSERT OR REPLACE INTO ' + dbInfo.storeName + ' (key, value) VALUES (?, ?)', [key, value], function () {
		                                resolve(originalValue);
		                            }, function (t, error) {
		                                reject(error);
		                            });
		                        }, function (sqlError) {
		                            // The transaction failed; check
		                            // to see if it's a quota error.
		                            if (sqlError.code === sqlError.QUOTA_ERR) {
		                                // We reject the callback outright for now, but
		                                // it's worth trying to re-run the transaction.
		                                // Even if the user accepts the prompt to use
		                                // more storage on Safari, this error will
		                                // be called.
		                                //
		                                // TODO: Try to re-run the transaction.
		                                reject(sqlError);
		                            }
		                        });
		                    }
		                });
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function removeItem(key, callback) {
		        var self = this;

		        // Cast the key to a string, as that's all we can set as a key.
		        if (typeof key !== 'string') {
		            globalObject.console.warn(key + ' used as a key, but it is not a string.');
		            key = String(key);
		        }

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                dbInfo.db.transaction(function (t) {
		                    t.executeSql('DELETE FROM ' + dbInfo.storeName + ' WHERE key = ?', [key], function () {
		                        resolve();
		                    }, function (t, error) {

		                        reject(error);
		                    });
		                });
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Deletes every item in the table.
		    // TODO: Find out if this resets the AUTO_INCREMENT number.
		    function clear(callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                dbInfo.db.transaction(function (t) {
		                    t.executeSql('DELETE FROM ' + dbInfo.storeName, [], function () {
		                        resolve();
		                    }, function (t, error) {
		                        reject(error);
		                    });
		                });
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Does a simple `COUNT(key)` to get the number of items stored in
		    // localForage.
		    function length(callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                dbInfo.db.transaction(function (t) {
		                    // Ahhh, SQL makes this one soooooo easy.
		                    t.executeSql('SELECT COUNT(key) as c FROM ' + dbInfo.storeName, [], function (t, results) {
		                        var result = results.rows.item(0).c;

		                        resolve(result);
		                    }, function (t, error) {

		                        reject(error);
		                    });
		                });
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    // Return the key located at key index X; essentially gets the key from a
		    // `WHERE id = ?`. This is the most efficient way I can think to implement
		    // this rarely-used (in my experience) part of the API, but it can seem
		    // inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
		    // the ID of each key will change every time it's updated. Perhaps a stored
		    // procedure for the `setItem()` SQL would solve this problem?
		    // TODO: Don't change ID on `setItem()`.
		    function key(n, callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                dbInfo.db.transaction(function (t) {
		                    t.executeSql('SELECT key FROM ' + dbInfo.storeName + ' WHERE id = ? LIMIT 1', [n + 1], function (t, results) {
		                        var result = results.rows.length ? results.rows.item(0).key : null;
		                        resolve(result);
		                    }, function (t, error) {
		                        reject(error);
		                    });
		                });
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function keys(callback) {
		        var self = this;

		        var promise = new Promise(function (resolve, reject) {
		            self.ready().then(function () {
		                var dbInfo = self._dbInfo;
		                dbInfo.db.transaction(function (t) {
		                    t.executeSql('SELECT key FROM ' + dbInfo.storeName, [], function (t, results) {
		                        var keys = [];

		                        for (var i = 0; i < results.rows.length; i++) {
		                            keys.push(results.rows.item(i).key);
		                        }

		                        resolve(keys);
		                    }, function (t, error) {

		                        reject(error);
		                    });
		                });
		            })['catch'](reject);
		        });

		        executeCallback(promise, callback);
		        return promise;
		    }

		    function executeCallback(promise, callback) {
		        if (callback) {
		            promise.then(function (result) {
		                callback(null, result);
		            }, function (error) {
		                callback(error);
		            });
		        }
		    }

		    var webSQLStorage = {
		        _driver: 'webSQLStorage',
		        _initStorage: _initStorage,
		        iterate: iterate,
		        getItem: getItem,
		        setItem: setItem,
		        removeItem: removeItem,
		        clear: clear,
		        length: length,
		        key: key,
		        keys: keys
		    };

		    return webSQLStorage;
		})(typeof window !== 'undefined' ? window : self);
		exports['default'] = webSQLStorage;
		module.exports = exports['default'];

	/***/ }
	/******/ ])
	});
	;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(2)))

/***/ },
/* 2 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ }
/******/ ])
});
;