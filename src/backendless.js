// Backendless.js 3.1.18

(function(factory) {
    var root = (typeof self == 'object' && self.self === self && self) ||
        (typeof global == 'object' && global.global === global && global);

    if (typeof define === "function" && define.amd) {
        define([], function() {
            return root.Backendless = factory(root);
        });

    } else if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = root.Backendless = factory(root);
    } else {
        root.Backendless = factory(root);
    }

})(function(root) {
    'use strict';

    var NodeDevice = {
        name    : 'NODEJS',
        platform: 'NODEJS',
        uuid    : 'someId',
        version : '1'
    };

    var isBrowser = (new Function("try {return this===window;}catch(e){ return false;}"))();

    var WebSocket = null; // isBrowser ? window.WebSocket || window.MozWebSocket : {};
    var UIState = null;

    var localStorageName = 'localStorage';

    var previousBackendless = root.Backendless;

    var Backendless = {};

    Backendless.VERSION = '3.1.18';
    Backendless.serverURL = 'https://api.backendless.com';

    Backendless.DEFAULTS = {
        pageSize: 10,
        offset: 0
    };

    Backendless.noConflict = function() {
        root.Backendless = previousBackendless;
        return this;
    };

    initXHR();

    var browser = (function() {
        var ua = 'NodeJS';

        if (isBrowser) {
            ua = navigator.userAgent ? navigator.userAgent.toLowerCase() : 'hybrid-app';
        }

        var match   = (/(chrome)[ \/]([\w.]+)/.exec(ua) ||
            /(webkit)[ \/]([\w.]+)/.exec(ua) ||
            /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
            /(msie) ([\w.]+)/.exec(ua) ||
            ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) || []),
            matched = {
                browser: match[1] || '',
                version: match[2] || '0'
            },
            browser = {};
        if (matched.browser) {
            browser[matched.browser] = true;
            browser.version = matched.version;
        }

        return browser;
    })();

    Backendless.browser = browser;

    import Utils from './utils';

    function initXHR() {
        try {
            if (typeof XMLHttpRequest.prototype.sendAsBinary == 'undefined') {
                XMLHttpRequest.prototype.sendAsBinary = function(text) {
                    var data = new ArrayBuffer(text.length);
                    var ui8a = new Uint8Array(data, 0);
                    for (var i = 0; i < text.length; i++) {
                        ui8a[i] = (text.charCodeAt(i) & 0xff);
                    }
                    this.send(ui8a);
                };
            }
        }
        catch (e) {
        }
    }

    function tryParseJSON(s) {
        try {
            return typeof s === 'string' ? JSON.parse(s) : s;
        } catch (e) {
            return s;
        }
    }

    Backendless.setUIState = function(stateName) {
        if (stateName === undefined) {
            throw new Error('UI state name must be defined or explicitly set to null');
        } else {
            UIState = stateName === null ? null : stateName;
        }
    };

    Backendless._ajax_for_browser = function(config) {
        var cashingAllowedArr = [
                'cacheOnly', 'remoteDataOnly', 'fromCacheOrRemote', 'fromRemoteOrCache', 'fromCacheAndRemote'],
            cacheMethods      = {
                ignoreCache       : function(config) {
                    return sendRequest(config);
                },
                cacheOnly         : function(config) {
                    var cachedResult = Backendless.LocalCache.get(config.url.replace(/([^A-Za-z0-9])/g, '')),
                        cacheError   = {
                            message   : 'error: cannot find data in Backendless.LocalCache',
                            statusCode: 404
                        };
                    if (cachedResult) {
                        config.isAsync && config.asyncHandler.success(cachedResult);
                        return cachedResult;
                    } else {
                        if (config.isAsync) {
                            config.asyncHandler.fault(cacheError);
                        } else {
                            throw cacheError;
                        }
                    }
                },
                remoteDataOnly    : function(config) {
                    return sendRequest(config);
                },
                fromCacheOrRemote : function(config) {
                    var cachedResult = Backendless.LocalCache.get(config.url.replace(/([^A-Za-z0-9])/g, ''));

                    if (cachedResult) {
                        config.isAsync && config.asyncHandler.success(cachedResult);
                        return cachedResult;
                    } else {
                        return sendRequest(config);
                    }
                },
                fromRemoteOrCache : function(config) {
                    return sendRequest(config);
                },
                fromCacheAndRemote: function(config) {
                    var result       = {},
                        cachedResult = Backendless.LocalCache.get(config.url.replace(/([^A-Za-z0-9])/g, '')),
                        cacheError   = {
                            message   : 'error: cannot find data in Backendless.LocalCache',
                            statusCode: 404
                        };

                    result.remote = sendRequest(config);

                    if (cachedResult) {
                        config.isAsync && config.asyncHandler.success(cachedResult);
                        result.local = cachedResult;
                    } else {
                        if (config.isAsync) {
                            config.asyncHandler.fault(cacheError);
                        } else {
                            throw cacheError;
                        }
                    }

                    return result;
                }
            },
            sendRequest       = function(config) {
                var xhr         = new XMLHttpRequest(),
                    contentType = config.data ? 'application/json' : 'application/x-www-form-urlencoded',
                    response;

                var parseResponse = function(xhr) {
                    var result = true;

                    if (xhr.responseText) {
                        result = tryParseJSON(xhr.responseText);
                    }

                    return result;
                };

                var badResponse = function(xhr) {
                    var result = {};

                    try {
                        result = JSON.parse(xhr.responseText);
                    } catch (e) {
                        result.message = xhr.responseText;
                    }

                    result.statusCode = xhr.status;
                    result.message = result.message || 'unknown error occurred';

                    return result;
                };

                var cacheHandler = function(response) {
                    response = cloneObject(response);
                    if (config.method == 'GET' && config.cacheActive) {
                        response.cachePolicy = config.cachePolicy;
                        Backendless.LocalCache.set(config.urlBlueprint, response);
                    } else if (Backendless.LocalCache.exists(config.urlBlueprint)) {
                        if (response === true || config.method == 'DELETE') {
                            response = undefined;
                        } else {
                            response.cachePolicy = Backendless.LocalCache.getCachePolicy(config.urlBlueprint);
                        }
                        '___class' in response && delete response['___class'];  // this issue must be fixed on server side

                        Backendless.LocalCache.set(config.urlBlueprint, response);
                    }
                };

                var checkInCache = function() {
                    return config.cacheActive && config.cachePolicy.policy == 'fromRemoteOrCache' && Backendless.LocalCache.exists(config.urlBlueprint);
                };

                xhr.open(config.method, config.url, config.isAsync);
                xhr.setRequestHeader('Content-Type', contentType);

                if ((currentUser != null && currentUser["user-token"])) {
                    xhr.setRequestHeader("user-token", currentUser["user-token"]);
                } else if (Backendless.LocalCache.exists("user-token")) {
                    xhr.setRequestHeader("user-token", Backendless.LocalCache.get("user-token"));
                }

                if (UIState !== null) {
                    xhr.setRequestHeader("uiState", UIState);
                }

                if (config.isAsync) {
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState == 4) {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                response = parseResponse(xhr);
                                cacheHandler(response);
                                config.asyncHandler.success && config.asyncHandler.success(response);
                            } else if (checkInCache()) {
                                config.asyncHandler.success && config.asyncHandler.success(Backendless.LocalCache.get(config.urlBlueprint));
                            } else {
                                config.asyncHandler.fault && config.asyncHandler.fault(badResponse(xhr));
                            }
                        }
                    };
                }

                xhr.send(config.data);

                if (config.isAsync) {
                    return xhr;
                } else if (xhr.status >= 200 && xhr.status < 300) {
                    response = parseResponse(xhr);
                    cacheHandler(response);
                    return response;
                } else if (checkInCache()) {
                    return Backendless.LocalCache.get(config.urlBlueprint);
                } else {
                    throw badResponse(xhr);
                }
            };

        config.method = config.method || 'GET';
        config.cachePolicy = config.cachePolicy || {policy: 'ignoreCache'};
        config.isAsync = (typeof config.isAsync == 'boolean') ? config.isAsync : false;
        config.cacheActive = (config.method == 'GET') && (cashingAllowedArr.indexOf(config.cachePolicy.policy) != -1);
        config.urlBlueprint = config.url.replace(/([^A-Za-z0-9])/g, '');

        try {
            return cacheMethods[config.cachePolicy.policy].call(this, config);
        } catch (error) {
            throw error;
        }
    };

    Backendless._ajax_for_nodejs = function(config) {
        config.data = config.data || "";
        config.asyncHandler = config.asyncHandler || {};
        config.isAsync = (typeof config.isAsync == 'boolean') ? config.isAsync : false;

        if (!config.isAsync) {
            throw new Error('Use Async type of request using Backendless with NodeJS. Add Backendless.Async(successCallback, errorCallback) as last argument');
        }

        if (typeof config.data !== "string") {
            config.data = JSON.stringify(config.data);
        }

        var u = require('url').parse(config.url);
        var https = u.protocol === 'https:';

        var options = {
            host   : u.hostname,
            port   : u.port || (https ? 443 : 80),
            method : config.method || "GET",
            path   : u.path,
            headers: {
                "Content-Length": config.data ? Buffer.byteLength(config.data) : 0,
                "Content-Type"  : config.data ? 'application/json' : 'application/x-www-form-urlencoded'
            }
        };

        if (currentUser != null && !!currentUser["user-token"]) {
            options.headers["user-token"] = currentUser["user-token"];
        } else if (Backendless.LocalCache.exists("user-token")) {
            options.headers["user-token"] = Backendless.LocalCache.get("user-token");
        }

        var buffer;
        var httpx = require(https ? 'https' : 'http');
        var req = httpx.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                buffer = buffer ? buffer + chunk : chunk;
            });
            res.on('end', function() {
                var callback = config.asyncHandler[res.statusCode >= 200 && res.statusCode < 300 ? "success" : "fault"];

                if (Utils.isFunction(callback)) {
                    var contentType = res.headers['content-type'];

                    if (buffer !== undefined && contentType && contentType.indexOf('application/json') !== -1) {
                        buffer = tryParseJSON(buffer);
                    }

                    callback(buffer);
                }
            });
        });

        req.on('error', function(e) {
            config.asyncHandler.fault && config.asyncHandler.fault(e);
        });

        req.write(config.data);

        return req.end();
    };

    Backendless._ajax = isBrowser ? Backendless._ajax_for_browser : Backendless._ajax_for_nodejs;

    import Async from './async';

    function setCache() {
        var store   = {},
            storage = {};

        store.enabled = false;

        store.exists = function(key) {
            return store.get(key) !== undefined;
        };

        store.set = function(key, value) {
            return storage[key] = store.serialize(value);
        };

        store.get = function(key) {
            var result = storage[key];

            return result && store.deserialize(result);
        };

        store.remove = function(key) {
            return delete storage[key];
        };

        store.clear = function() {
            storage = {};
        };

        store.flushExpired = function() {
        };

        store.getCachePolicy = function(key) {
        };

        store.getAll = function () {
            var result = {};

            for (var prop in storage) {
                if (storage.hasOwnProperty(prop)) {
                    result[prop] = storage[prop];
                }
            }

            return result;
        };

        store.serialize = function(value) {
            return JSON.stringify(value);
        };

        store.deserialize = function(value) {
            if (typeof value != 'string') {
                return undefined;
            }
            try {
                return JSON.parse(value);
            } catch (e) {
                return value || undefined;
            }
        };

        function isLocalStorageSupported() {
            try {
                if (isBrowser && (localStorageName in window && window[localStorageName])) {
                    localStorage.setItem('localStorageTest', true);
                    localStorage.removeItem('localStorageTest');
                    return true;
                } else {
                    return false;
                }
            } catch (e) {
                return false;
            }
        }

        if (isLocalStorageSupported()) {
            return extendToLocalStorageCache(store);
        }

        return store;
    }

    function extendToLocalStorageCache(store) {
        var storage = window[localStorageName];

        var createBndlsStorage = function() {
            if (!(storage.getItem('Backendless'))) {
                storage.setItem('Backendless', store.serialize({}));
            }
        };

        var expired = function(obj) {
            var result = false;
            if (obj && Object.prototype.toString.call(obj).slice(8, -1) == "Object") {
                if ('cachePolicy' in obj && 'timeToLive' in obj['cachePolicy'] && obj['cachePolicy']['timeToLive'] != -1 && 'created' in obj['cachePolicy']) {
                    result = (new Date().getTime() - obj['cachePolicy']['created']) > obj['cachePolicy']['timeToLive'];
                }
            }

            return result;
        };

        var addTimestamp = function(obj) {
            if (obj && Object.prototype.toString.call(obj).slice(8, -1) == "Object") {
                if ('cachePolicy' in obj && 'timeToLive' in obj['cachePolicy']) {
                    obj['cachePolicy']['created'] = new Date().getTime();
                }
            }
        };

        createBndlsStorage();

        store.enabled = true;

        store.exists = function(key) {
            return store.get(key) !== undefined;
        };

        store.set = function(key, val) {
            if (val === undefined) {
                return store.remove(key);
            }

            createBndlsStorage();

            var backendlessObj = store.deserialize(storage.getItem('Backendless'));

            addTimestamp(val);

            backendlessObj[key] = val;

            try {
                storage.setItem('Backendless', store.serialize(backendlessObj));
            } catch (e) {
                backendlessObj = {};
                backendlessObj[key] = val;
                storage.setItem('Backendless', store.serialize(backendlessObj));
            }

            return val;
        };

        store.get = function(key) {
            createBndlsStorage();

            var backendlessObj = store.deserialize(storage.getItem('Backendless')),
                obj            = backendlessObj[key],
                result         = obj;

            if (expired(obj)) {
                delete backendlessObj[key];
                storage.setItem('Backendless', store.serialize(backendlessObj));
                result = undefined;
            }

            if (result && result['cachePolicy']) {
                delete result['cachePolicy'];
            }

            return result;
        };

        store.remove = function(key) {
            var result;

            createBndlsStorage();

            key = key.replace(/([^A-Za-z0-9-])/g, '');

            var backendlessObj = store.deserialize(storage.getItem('Backendless'));

            if (backendlessObj.hasOwnProperty(key)) {
                result = delete backendlessObj[key];
            }

            storage.setItem('Backendless', store.serialize(backendlessObj));

            return result;
        };

        store.clear = function() {
            storage.setItem('Backendless', store.serialize({}));
        };

        store.getAll = function() {
            createBndlsStorage();

            var backendlessObj = store.deserialize(storage.getItem('Backendless'));
            var ret = {};

            for (var prop in backendlessObj) {
                if (backendlessObj.hasOwnProperty(prop)) {
                    ret[prop] = backendlessObj[prop];
                    if (ret[prop] !== null && ret[prop].hasOwnProperty('cachePolicy')) {
                        delete ret[prop]['cachePolicy'];
                    }
                }
            }

            return ret;
        };

        store.flushExpired = function() {
            createBndlsStorage();

            var backendlessObj = store.deserialize(storage.getItem('Backendless')),
                obj;

            for (var prop in backendlessObj) {
                if (backendlessObj.hasOwnProperty(prop)) {
                    obj = backendlessObj[prop];
                    if (expired(obj)) {
                        delete backendlessObj[prop];
                        storage.setItem('Backendless', store.serialize(backendlessObj));
                    }
                }
            }
        };

        store.getCachePolicy = function(key) {
            createBndlsStorage();

            var backendlessObj = store.deserialize(storage.getItem('Backendless'));
            var obj = backendlessObj[key];

            return obj ? obj['cachePolicy'] : undefined;
        };

        return store;
    }

    Backendless.LocalCache = setCache();

    if (Backendless.LocalCache.enabled) {
        Backendless.LocalCache.flushExpired();
    }

    import DataStore from './data-store';

    var dataStoreCache = {};

    import persistence from './persistence';

    import DataPermissions from './data-permissions';

    import User from './user';

    Backendless.User = User;

    var currentUser = null;

    import UserService from './users';

    import Geo from './geo';

    import Proxy from './proxy';

    import PollingProxy from './polling-proxy';

    import SocketProxy from './socket-proxy';

    import Subscription from './subscription';

    import Messaging from './messaging';

    function getBuilder(filename, filedata, boundary) {
        var dashdash = '--',
            crlf     = '\r\n',
            builder  = '';

        builder += dashdash;
        builder += boundary;
        builder += crlf;
        builder += 'Content-Disposition: form-data; name="file"';
        builder += '; filename="' + filename + '"';
        builder += crlf;

        builder += 'Content-Type: application/octet-stream';
        builder += crlf;
        builder += crlf;

        builder += filedata;
        builder += crlf;

        builder += dashdash;
        builder += boundary;
        builder += dashdash;
        builder += crlf;

        return builder;
    }

    function send(e) {
        var xhr         = new XMLHttpRequest(),
            boundary    = '-backendless-multipart-form-boundary-' + getNow(),
            builder     = getBuilder(this.fileName, e.target.result, boundary),
            badResponse = function(xhr) {
                var result = {};
                try {
                    result = JSON.parse(xhr.responseText);
                } catch (e) {
                    result.message = xhr.responseText;
                }
                result.statusCode = xhr.status;
                return result;
            };

        xhr.open("POST", this.uploadPath, true);
        xhr.setRequestHeader('content-type', 'multipart/form-data; boundary=' + boundary);

        if ((currentUser != null && currentUser["user-token"])) {
            xhr.setRequestHeader("user-token", currentUser["user-token"]);
        } else if (Backendless.LocalCache.exists("user-token")) {
            xhr.setRequestHeader("user-token", Backendless.LocalCache.get("user-token"));
        }

        if (UIState !== null) {
            xhr.setRequestHeader("uiState", UIState);
        }

        var asyncHandler = this.asyncHandler;

        if (asyncHandler) {
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        asyncHandler.success(JSON.parse(xhr.responseText));
                    } else {
                        asyncHandler.fault(JSON.parse(xhr.responseText));
                    }
                }
            };
        }

        xhr.sendAsBinary(builder);

        if (asyncHandler) {
            return xhr;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
            return xhr.responseText ? JSON.parse(xhr.responseText) : true;
        } else {
            throw badResponse(xhr);
        }
    }

    function sendEncoded(e) {
        var xhr         = new XMLHttpRequest(),
            boundary    = '-backendless-multipart-form-boundary-' + getNow(),
            badResponse = function(xhr) {
                var result = {};
                try {
                    result = JSON.parse(xhr.responseText);
                } catch (e) {
                    result.message = xhr.responseText;
                }
                result.statusCode = xhr.status;
                return result;
            };

        xhr.open("PUT", this.uploadPath, true);
        xhr.setRequestHeader('Content-Type', 'text/plain');

        if (UIState !== null) {
            xhr.setRequestHeader("uiState", UIState);
        }

        var asyncHandler = this.asyncHandler;

        if (asyncHandler) {
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        asyncHandler.success(JSON.parse(xhr.responseText));
                    } else {
                        asyncHandler.fault(JSON.parse(xhr.responseText));
                    }
                }
            };
        }

        xhr.send(e.target.result.split(',')[1]);

        if (asyncHandler) {
            return xhr;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
            return xhr.responseText ? JSON.parse(xhr.responseText) : true;
        } else {
            throw badResponse(xhr);
        }
    }

    import FilePermissions from './file-permissions';

    import Files from './files';

    import Commerce from './commerce';

    import Events from './events';

    import Cache from './cache';

    import Counters from './counters';

    import Logging from './logging';

    import CustomServices from './custom-services';

    Backendless.initApp = function(appId, secretKey) {
        Backendless.applicationId = appId;
        Backendless.secretKey = secretKey;
        Backendless.appPath = [Backendless.serverURL, appId, secretKey].join('/');
        Backendless.UserService = new UserService();
        Backendless.Users = Backendless.UserService;
        Backendless.Geo = new Geo();
        Backendless.Persistence = persistence;
        Backendless.Data = persistence;
        Backendless.Data.Permissions = new DataPermissions();
        Backendless.Messaging = new Messaging();
        Backendless.Files = new Files();
        Backendless.Files.Permissions = new FilePermissions();
        Backendless.Commerce = new Commerce();
        Backendless.Events = new Events();
        Backendless.Cache = new Cache();
        Backendless.Counters = new Counters();
        Backendless.CustomServices = new CustomServices();
        dataStoreCache = {};
        currentUser = null;
    };

    import DataQuery from './data-query';

    import PagingQueryBuilder from './paging-query-builder';

    import DataQueryBuilder from './data-query-builder';

    import LoadRelationsQueryBuilder from './load-relations-query-builder';

    import GeoQuery from './geo-query';

    import GeoPoint from './geo-point';

    import GeoCluster from './geo-cluster';

    var PublishOptionsHeaders = { //PublishOptions headers namespace helper
        'MESSAGE_TAG'                  : 'message',
        'IOS_ALERT_TAG'                : 'ios-alert',
        'IOS_BADGE_TAG'                : 'ios-badge',
        'IOS_SOUND_TAG'                : 'ios-sound',
        'ANDROID_TICKER_TEXT_TAG'      : 'android-ticker-text',
        'ANDROID_CONTENT_TITLE_TAG'    : 'android-content-title',
        'ANDROID_CONTENT_TEXT_TAG'     : 'android-content-text',
        'ANDROID_ACTION_TAG'           : 'android-action',
        'WP_TYPE_TAG'                  : 'wp-type',
        'WP_TITLE_TAG'                 : 'wp-title',
        'WP_TOAST_SUBTITLE_TAG'        : 'wp-subtitle',
        'WP_TOAST_PARAMETER_TAG'       : 'wp-parameter',
        'WP_TILE_BACKGROUND_IMAGE'     : 'wp-backgroundImage',
        'WP_TILE_COUNT'                : 'wp-count',
        'WP_TILE_BACK_TITLE'           : 'wp-backTitle',
        'WP_TILE_BACK_BACKGROUND_IMAGE': 'wp-backImage',
        'WP_TILE_BACK_CONTENT'         : 'wp-backContent',
        'WP_RAW_DATA'                  : 'wp-raw'
    };

    var PublishOptions = function(args) {
        args = args || {};
        this.publisherId = args.publisherId || undefined;
        this.headers = args.headers || undefined;
        this.subtopic = args.subtopic || undefined;
    };

    var DeliveryOptions = function(args) {
        args = args || {};
        this.pushPolicy = args.pushPolicy || undefined;
        this.pushBroadcast = args.pushBroadcast || undefined;
        this.pushSinglecast = args.pushSinglecast || undefined;
        this.publishAt = args.publishAt || undefined;
        this.repeatEvery = args.repeatEvery || undefined;
        this.repeatExpiresAt = args.repeatExpiresAt || undefined;
    };

    var Bodyparts = function(args) {
        args = args || {};
        this.textmessage = args.textmessage || undefined;
        this.htmlmessage = args.htmlmessage || undefined;
    };

    var SubscriptionOptions = function(args) {
        args = args || {};
        this.subscriberId = args.subscriberId || undefined;
        this.subtopic = args.subtopic || undefined;
        this.selector = args.selector || undefined;
    };

    Backendless.DataQueryBuilder = DataQueryBuilder;
    Backendless.LoadRelationsQueryBuilder = LoadRelationsQueryBuilder;
    Backendless.GeoQuery = GeoQuery;
    Backendless.GeoPoint = GeoPoint;
    Backendless.GeoCluster = GeoCluster;
    Backendless.Bodyparts = Bodyparts;
    Backendless.PublishOptions = PublishOptions;
    Backendless.DeliveryOptions = DeliveryOptions;
    Backendless.SubscriptionOptions = SubscriptionOptions;
    Backendless.PublishOptionsHeaders = PublishOptionsHeaders;

    return Backendless;
});