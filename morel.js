/*!
 * Mobile Recording Library for biological data collection. 
 * Version: 3.0.0-alpha
 *
 * https://github.com/NERC-CEH/morel
 *
 * Author 2015 Karols Kazlauskis
 * Released under the GNU GPL v3 * license.
 */
(function (factory) {
    // Establish the root object, `window` (`self`) in the browser, or `global` on the server.
    // We use `self` instead of `window` for `WebWorker` support.
    var root = (typeof self === 'object' && self.self === self && self) ||
        (typeof global === 'object' && global.global === global && global);

    //AMD
    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'exports'], function ($, exports) {
            root.morel = factory(root, exports, $);
        });

        //Node.js or CommonJS
    } else if (typeof exports !== 'undefined') {
        try { $ = require('jquery');} catch (e) {}
        factory(root, exports, $);

        //Browser global
    } else {
        root.morel = factory(root, {}, (root.$ || root.jQuery));
    }
}(function (root, m, $) {
    /*
     * Things to work on:
     *  - Decouple the modules as much as possible
     *  - Close as many global variables
     */
    "use strict";

    m.VERSION = '3.0.0-alpha'; //library version, generated/replaced by grunt

    //library wide configuration
    m.CONF = {};

    //CONSTANTS:
    m.TRUE = 1;
    m.FALSE = 0;
    m.ERROR = -1;

    m.SETTINGS_KEY = 'morel-settings';

    /**
     * Initialises the application settings.
     */
    m.initSettings = function () {
        m.storage.set(m.SETTINGS_KEY, {});
    };

    /**
     * Resets the morel to the initial state.
     *
     * Clears localStorage.
     * Clears sessionStorage.
     * Clears databases.
     */
    m.reset = function () {
        m.storage.clear();
        m.storage.tmpClear();

        m.db.clear();
    };


    /***********************************************************************
     * HELPER FUNCTIONS
     *
     * Functions that were too ambiguous to be placed in one module.
     **********************************************************************/

    /**
     * Clones an object.
     *
     * @param obj
     * @returns {*}
     */
    m.objClone = function(obj) {
        if (null === obj || "object" !== typeof obj) {
            return obj;
        }
        var copy = obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) {
                copy[attr] = objClone(obj[attr]);
            }
        }
        return copy;
    };

    /**
     * Generate UUID.
     */
    m.getNewUUID = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    };

    /**
     * Converts DataURI object to a Blob.
     *
     * @param {type} dataURI
     * @param {type} fileType
     * @returns {undefined}
     */
    m.dataURItoBlob = function(dataURI, fileType) {
        var binary = atob(dataURI.split(',')[1]);
        var array = [];
        for (var i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
        }
        return new Blob([new Uint8Array(array)], {
            type: fileType
        });
    };

    // Detecting data URLs
    // https://gist.github.com/bgrins/6194623

    // data URI - MDN https://developer.mozilla.org/en-US/docs/data_URIs
    // The "data" URL scheme: http://tools.ietf.org/html/rfc2397
    // Valid URL Characters: http://tools.ietf.org/html/rfc2396#section2
    m.isDataURL = function (s) {
        if (!s) {
            return false;
        }
        s = s.toString(); //numbers

        var regex = /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i;
        return !!s.match(regex);
    };

    //From jQuery 1.4.4 .
    m.isPlainObject = function(obj) {
        function type( obj ) {
            var class2type = {};
            var types = "Boolean Number String Function Array Date RegExp Object".split(" ");
            for (var i = 0; i < types.length; i++) {
                class2type["[object " + types[i] + "]"] = types[i].toLowerCase();
            }
            return obj == null ?
                String( obj ) :
            class2type[ toString.call(obj) ] || "object";
        }

        function isWindow( obj ) {
            return obj && typeof obj === "object" && "setInterval" in obj;
        }

        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure that DOM nodes and window objects don't pass through, as well
        if ( !obj || type(obj) !== "object" || obj.nodeType || isWindow( obj ) ) {
            return false;
        }

        // Not own constructor property must be Object
        if ( obj.constructor &&
            !hasOwn.call(obj, "constructor") &&
            !hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
            return false;
        }

        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.

        var key;
        for ( key in obj ) {}

        return key === undefined || hasOwn.call( obj, key );
    };

    //checks if the object has any elements.
    m.isEmptyObject = function(obj) {
        for (var key in obj) {
            return false;
        }
        return true;
    };

    m.extend = function (a, b) {
        if (typeof b === 'function') {
            b = b();
        }

        //extend the library itself
        if (typeof a === 'string') {
            m[a] || (m[a] = {});
            return ext(m[a], b);

        //normal object extend
        } else {
            return ext(a, b);
        }

        function ext (a, b) {
            for (var key in b) {
                if (b.hasOwnProperty(key)) {
                    a[key] = b[key];
                }
            }
            return a;
        }
    };


//{
//  id: 'yyyyy-yyyyyy-yyyyyyy-yyyyy',
//    warehouseID: -1, //occurrence_id
//  status: 'local', //sent
//  attr: {
//  'occurrence:comment': 'value',
//    'occAttr:12': 'value'
//},
//  images: [
//    {
//      status: 'local', //sent
//      url: 'http://..', // points to the image on server
//      data: 'data64:...'
//    }
//  ]
//};


    m.Occurrence = (function () {

        var Module = function () {
            this.id = m.getNewUUID();
        };

        m.extend(Module.prototype, {
            id: '',
            warehouseID: -1,
            status: 'local',
            attributes: {},
            images: [],

            set: function (key, data) {
                this.attributes[key] = data;
            },

            get: function (key) {
                return this.attributes[key];
            },

            remove: function (key) {
              delete this.attributes[key];
            },

            clear: function () {
                this.attributes = {};
            },

            has: function(key) {
                return this.get(key) !== null;
            },

            removeAllImages: function () {
                this.images = [];
            },

            toJSON: function () {
                var data = {
                    sample: this.sample
                };
                //add occurrences
                return data;
            }
        });

        return Module;
    }());

    m.OccurrenceCollection = (function () {

        var Module = function () {
        };

        m.extend(Module.prototype, {
            occurrences: [],

            Occurrence: m.Occurrence,

            add: function (occurrences) {
                return this.set(occurrences);
            },

            set: function (occurrences, options) {
                //make an array if single object
                if (!(occurrences instanceof Array)) {
                    occurrences = [occurrences];
                }

                var existing;
                for (var i = 0; i < occurrences.length; i++) {
                    //update existing ones
                    if (existing = this.get(occurrences[i])) {
                        existing.set(occurrences[i].attributes);

                    //add new
                    } else {
                        this.occurrences.push(occurrences[i]);
                    }
                }
                return occurrences;
            },

            /**
             *
             * @param occurrence occurrence or its ID
             * @returns {*}
             */
            get: function (occurrence) {
                var id = occurrence.id || occurrence;
                for (var i = 0; i < this.occurrences.length; i++) {
                    if (this.occurrences[i].id == id) {
                        return this.occurrences[i];
                    }
                }
                return null;
            },

            create: function () {
                var occurrence = new this.Occurrence();
                this.add(occurrence);
                return occurrence;
            },

            remove: function (occurrences) {
                var removed = [];
                for (var i = 0; i < this.occurrences.length; i++) {
                    var occurrence = this.get(occurrences[i]);
                    if (!occurrence) continue;

                    //get index
                    var index = -1;
                    for (var j = 0; index < this.occurrences.length; j++) {
                        if (this.occurrences[j].id === occurrence.id) {
                            index = j;
                            break;
                        }
                    }
                    if (j > -1) {
                        this.occurrences.slice(index, 1);
                        removed.push(occurrence);
                    }
                }
                return removed;
            }
        });

        return Module;
    }());
//data = {
//    id: 'xxxxxxx-xxxxxx-xxxxxx-xxxx',
//    status: 'local', // sent
//    warehouseId: -1, //sample_id - 1234567 - 32bit
//    sample: {},
//    occurrences: []
//};


    m.Sample = (function () {

        var Module = function (options) {
            this.id = m.getNewUUID();
            this.occurrences = new m.OccurrenceCollection();
        };

        m.extend(Module.prototype, {
            id: '',
            status: 'local',
            warehouseId: -1,
            userId: -1,
            attributes: {},
            occurrences: {},

            set: function (key, data) {
                this.attributes[key] = data;
            },

            get: function (key) {
                return this.attributes[key];
            },

            remove: function (key) {
                delete this.attributes[key];
            },

            clear: function () {
                this.attributes = {};
            },

            has: function (key) {
                return this.get(key) !== null;
            },

            toJSON: function () {
                var data = {
                    sample: this.sample
                };
                //add occurrences
                return data;
            }
        });

        return Module;
    }());
    /***********************************************************************
     * STORAGE MODULE
     **********************************************************************/

    m.Storage = (function () {

        var Module = function () {
            this.storage = {};
        };

        m.extend(Module.prototype, {
            NAME: 'Storage',

            /**
             * Gets an key from the storage.
             *
             * @param key
             */
            get: function (key, callback) {
                var data = this.storage[key];
                callback(null, data);
            },

            /**
             * Returns all the keys from the storage;
             *
             * @returns {{}|*|m.Storage.storage}
             */
            getAll: function (callback) {
                var data = this.storage;
                callback(null, data);
            },

            /**
             * Sets an key in the storage.
             * Note: it overrides any existing key with the same name.
             *
             * @param key
             */
            set: function (key, data, callback) {
                this.storage[key] = data;
                callback && callback(null, data);
            },

            /**
             * Removes the key from the storage.
             *
             * @param key
             */
            remove: function (key, callback) {
                delete this.storage[key];
                callback && callback();
            },

            /**
             * Checks if the key exists.
             *
             * @param key Input name
             * @returns {boolean}
             */
            has: function (key, callback) {
                var data = this.get(key, function (err, data) {
                    callback(null, data );
                });
            },

            /**
             * Clears the storage.
             */
            clear: function (callback) {
                this.storage = {};
                callback && callback(null, this.storage);
            },

            size: function (callback) {
                var data = Object.keys(this.storage).length;
                callback(null, data);
            }
        });

        return Module;
    })();

    /***********************************************************************
     * STORAGE MODULE
     **********************************************************************/

    m.LocalStorage = (function () {
        var Module = function () {
        };

        m.extend(Module.prototype, {
            NAME: 'LocalStorage',

            /**
             * Gets an key from the storage.
             *
             * @param key
             */
            get: function (key, callback) {
                var data = localStorage.getItem(key);
                data = JSON.parse(data);

                callback(null, data);
            },

            /**
             * Returns all the keys from the store;
             * @returns {{}}
             */
            getAll: function (callback) {
                var data = {};
                var key = '';
                for ( var i = 0, len = localStorage.length; i < len; ++i ) {
                    key = localStorage.key(i);
                    data[key] = localStorage.getItem(key);
                }
                callback(null, data);
            },

            /**
             * Sets an key in the storage.
             * Note: it overrides any existing key with the same name.
             *
             * @param key
             */
            set: function (key, data, callback) {
                data = JSON.stringify(data);
                localStorage.setItem(key, data);
                callback && callback(null, data);
            },

            /**
             * Removes the key from the storage.
             *
             * @param key
             */
            remove: function (key, callback) {
                localStorage.removeItem(key);
                callback && callback();
            },


            /**
             * Checks if the key exists.
             *
             * @param key Input name
             * @returns {boolean}
             */
            has: function (key, callback) {
                var data = null;
                var val = this.get(key, function (err, data) {
                    if (m.isPlainObject(val)) {
                        data = !m.isEmptyObject(val);
                    } else {
                        data = val;
                    }

                    callback(null, data !== null);
                });
            },


            /**
             * Clears the storage.
             */
            clear: function (callback) {
                localStorage.clear();
                callback && callback();
            },

            size: function (callback) {
                callback(null, localStorage.length);
            },

            /**
             * Checks if there is enough space in the storage.
             *
             * @param size
             * @returns {*}
             */
            hasSpace: function (size, callback) {
                var taken = JSON.stringify(localStorage).length;
                var left = 1024 * 1024 * 5 - taken;
                if ((left - size) > 0) {
                    callback(null, 1);
                } else {
                    callback(null, 0);
                }
            }

        });

        return Module;
    })();


//{
//  id: 'yyyyy-yyyyyy-yyyyyyy-yyyyy',
//    warehouseID: -1, //occurrence_id
//  status: 'local', //sent
//  attr: {
//  'occurrence:comment': 'value',
//    'occAttr:12': 'value'
//},
//  images: [
//    {
//      status: 'local', //sent
//      url: 'http://..', // points to the image on server
//      data: 'data64:...'
//    }
//  ]
//};



    m.extend('Error', function () {
        var Error = function (message) {
            this.message = message;
        };

        return Error;
    });


    m.DatabaseStorage = (function () {
        var Module = function () {
        };

        m.extend(Module.prototype, {
            //because of iOS8 bug on home screen: null & readonly window.indexedDB

            indexedDB: window._indexedDB || window.indexedDB,
            IDBKeyRange: window._IDBKeyRange || window.IDBKeyRange,

            VERSION: 1,
            NAME: 'DatabaseStorage',
            DB_NAME: "morel",
            STORE_NAME: "samples",

            /**
             * Adds a record under a specified key to the database.
             * Note: might be a good idea to move the key assignment away from
             * the function parameters and rather auto assign one and return on callback.
             *
             * @param record
             * @param key
             * @param callback
             * @param onError
             */
            set: function (key, data, callback) {
                this.open(function (err, store) {
                    if (err) {
                        if (callback) {
                            callback(err);
                        }
                        return;
                    }

                    var req = store.put(data, key);

                    req.onsuccess = function () {
                        if (callback) {
                            callback(null, data);
                        }
                    };

                    req.onerror = function (e) {
                        var message = 'Database Problem: ' + e.target.error.message,
                            error = new m.Error(message);
                        console.error(message);
                        callback(error);
                    };
                });
            },

            /**
             * Gets a specific saved data from the database.
             * @param key The stored data Id.
             * @param callback
             * @aram onError
             * @returns {*}
             */
            get: function (key, callback) {
                this.open(function (err, store) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var req = store.index('id').get(key);
                    req.onsuccess = function (e) {
                        var data = e.target.result;
                        callback(null, data);
                    };

                    req.onerror = function (e) {
                        var message = 'Database Problem: ' + e.target.error.message,
                            error = new m.Error(message);
                        console.error(message);
                        callback(error);
                    };
                });
            },

            /**
             * Removes a saved data from the database.
             *
             * @param key
             * @param callback
             * @param onError
             */
            remove: function (key, callback) {
                var that = this;

                this.open(function (err, store) {
                    if (err) {
                        if (callback) {
                            callback(err);
                        }
                        return;
                    }

                    var req = store.openCursor(that.IDBKeyRange.only(key));
                    req.onsuccess = function () {
                        var cursor = req.result;
                        if (cursor) {
                            store.delete(cursor.primaryKey);
                            cursor.continue();
                        } else {
                            if (callback) {
                                callback();
                            }
                        }
                    };
                    req.onerror = function (e) {
                        var message = 'Database Problem: ' + e.target.error.message,
                            error = new m.Error(message);
                        console.error(message);
                        callback(error);
                    };
                });
            },

            /**
             * Brings back all saved data from the database.
             */
            getAll: function (callback) {
                var that = this;

                this.open(function (err, store) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    // Get everything in the store
                    var keyRange = that.IDBKeyRange.lowerBound(0),
                        req = store.openCursor(keyRange),
                        data = {};

                    req.onsuccess = function (e) {
                        var result = e.target.result;

                        // If there's data, add it to array
                        if (result) {
                            data[result.key] = result.value;
                            result.continue();

                            // Reach the end of the data
                        } else {
                            callback(null, data);
                        }
                    };

                    req.onerror = function (e) {
                        var message = 'Database Problem: ' + e.target.error.message,
                            error = new m.Error(message);
                        console.error(message);
                        callback(error);
                    };
                });
            },

            /**
             * Checks whether the data under a provided key exists in the database.
             *
             * @param key
             * @param callback
             * @param onError
             */
            has: function (key, callback) {
                this.get(key, function (err, data) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, data !== null);
                });
            },

            /**
             * Clears all the saved data.
             */
            clear: function (callback) {
                this.open(function (err, store) {
                    if (err) {
                        if (callback) {
                            callback(err);
                        }
                        return;
                    }

                    var req = store.clear();

                    req.onsuccess = function () {
                        if (callback) {
                            callback();
                        }
                    };

                    req.onerror = function (e) {
                        var message = 'Database Problem: ' + e.target.error.message,
                            error = new m.Error(message);
                        console.error(message);

                        if (callback) {
                            callback(error);
                        }
                    };
                });
            },

            size: function (callback) {
                this.open(function (err, store) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var req = store.count();
                    req.onsuccess = function () {
                        callback(null, req.result);
                    };

                    req.onerror = function (e) {
                        var message = 'Database Problem: ' + e.target.error.message,
                            error = new m.Error(message);
                        console.error(message);
                        callback(error);
                    };
                });
            },

            /**
             * Opens a database connection and returns a records store.
             *
             * @param onError
             * @param callback
             */
            open: function (callback) {
                var that = this,
                    req = this.indexedDB.open(this.DB_NAME, this.VERSION);

                /**
                 * On Database opening success, returns the Records object store.
                 *
                 * @param e
                 */
                req.onsuccess = function (e) {
                    var db = e.target.result,
                        transaction = db.transaction([that.STORE_NAME], "readwrite"),
                        store = null,
                        err = null;
                    if (transaction) {
                        store = transaction.objectStore(that.STORE_NAME);
                        if (store) {
                            callback(null, store);
                        } else {
                            err = new m.Error('Database Problem: no such store');
                            callback(err);
                        }
                    }
                };

                /**
                 * If the Database needs an upgrade or is initialising.
                 *
                 * @param e
                 */
                req.onupgradeneeded = function (e) {
                    var db = e.target.result;
                    db.createObjectStore(that.STORE_NAME);
                };

                /**
                 * Error of opening the database.
                 *
                 * @param e
                 */
                req.onerror = function (e) {
                    var message = 'Database Problem: ' + e.target.error.message,
                        error = new m.Error(message);
                    console.error(message);
                    callback(error);
                };

                /**
                 * Error on database being blocked.
                 *
                 * @param e
                 */
                req.onblocked = function (e) {
                    var message = 'Database Problem: ' + e.target.error.message,
                        error = new m.Error(message);
                    console.error(message);
                    callback(error);
                };
            }
        });

        return Module;
    }());


    return m;
}));