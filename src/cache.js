import Backendless from './backendless'
import utils from './utils'

var Cache = function () {
    this.restUrl = Backendless.appPath + '/cache/';
};

var FactoryMethods = {};

Cache.prototype = {
    put: utils.promisified('_put'),

    putSync: utils.synchronized('_put'),

    _put: function (key, value, timeToLive, async) {
        if (!utils.isString(key)) {
            throw new Error('You can use only String as key to put into Cache');
        }

        if (!(timeToLive instanceof Async)) {
            if (typeof timeToLive == 'object' && !arguments[3]) {
                async = timeToLive;
                timeToLive = null;
            } else if (typeof timeToLive != ('number' || 'string') && timeToLive != null) {
                throw new Error('You can use only String as timeToLive attribute to put into Cache');
            }
        } else {
            async = timeToLive;
            timeToLive = null;
        }

        if (utils.isObject(value) && value.constructor !== Object) {
            value.___class = value.___class || utils.getClassName(value);
        }

        var responder = utils.extractResponder([async]), isAsync = false;

        if (responder != null) {
            isAsync = true;
            responder = wrapAsync(responder);
        }

        return Backendless._ajax({
            method: 'PUT',
            url: this.restUrl + key + ((timeToLive) ? '?timeout=' + timeToLive : ''),
            data: JSON.stringify(value),
            isAsync: isAsync,
            asyncHandler: responder
        });
    },

    expireIn: utils.promisified('_expireIn'),

    expireInSync: utils.synchronized('_expireIn'),

    _expireIn: function (key, seconds, async) {
        if (utils.isString(key) && (utils.isNumber(seconds) || utils.isDate(seconds)) && seconds) {
            seconds = (utils.isDate(seconds)) ? seconds.getTime() : seconds;
            var responder = utils.extractResponder(arguments), isAsync = false;
            if (responder != null) {
                isAsync = true;
                responder = wrapAsync(responder);
            }

            return Backendless._ajax({
                method: 'PUT',
                url: this.restUrl + key + '/expireIn?timeout=' + seconds,
                data: JSON.stringify({}),
                isAsync: isAsync,
                asyncHandler: responder
            });
        } else {
            throw new Error('The "key" argument must be String. The "seconds" argument can be either Number or Date');
        }
    },

    expireAt: utils.promisified('_expireAt'),

    expireAtSync: utils.synchronized('_expireAt'),

    _expireAt: function (key, timestamp, async) {
        if (utils.isString(key) && (utils.isNumber(timestamp) || utils.isDate(timestamp)) && timestamp) {
            timestamp = (utils.isDate(timestamp)) ? timestamp.getTime() : timestamp;
            var responder = utils.extractResponder(arguments), isAsync = false;
            if (responder != null) {
                isAsync = true;
                responder = utils.wrapAsync(responder);
            }

            return Backendless._ajax({
                method: 'PUT',
                url: this.restUrl + key + '/expireAt?timestamp=' + timestamp,
                data: JSON.stringify({}),
                isAsync: isAsync,
                asyncHandler: responder
            });
        } else {
            throw new Error('You can use only String as key while expire in Cache. Second attribute must be declared and must be a Number or Date type');
        }
    },

    _cacheMethod: function (method, key, contain, async) {
        if (!utils.isString(key)) {
            throw new Error('The "key" argument must be String');
        }

        var responder = utils.extractResponder(arguments), isAsync = false;

        if (responder != null) {
            isAsync = true;
            responder = utils.wrapAsync(responder);
        }

        return Backendless._ajax({
            method: method,
            url: this.restUrl + key + (contain ? '/check' : ''),
            isAsync: isAsync,
            asyncHandler: responder
        });
    },

    contains: utils.promisified('_contains'),

    containsSync: utils.synchronized('_contains'),

    _contains: function (key, async) {
        return this._cacheMethod('GET', key, true, async);
    },

    get: utils.promisified('_get'),

    getSync: utils.synchronized('_get'),

    _get: function (key, async) {
        if (!utils.isString(key)) {
            throw new Error('The "key" argument must be String');
        }

        function parseResult(result) {
            var className = result && result.___class;

            if (className) {
                var clazz = FactoryMethods[className] || root[className];

                if (clazz) {
                    result = new clazz(result);
                }
            }

            return result;
        }

        var responder = utils.extractResponder(arguments), isAsync = false;

        if (responder != null) {
            isAsync = true;
            responder = utils.wrapAsync(responder, parseResult, this);
        }

        var result = Backendless._ajax({
            method: 'GET',
            url: this.restUrl + key,
            isAsync: isAsync,
            asyncHandler: responder
        });

        return isAsync ? result : parseResult(result);
    },

    remove: utils.promisified('_remove'),

    removeSync: utils.synchronized('_remove'),

    _remove: function (key, async) {
        return this._cacheMethod('DELETE', key, false, async);
    },

    setObjectFactory: function (objectName, factoryMethod) {
        FactoryMethods[objectName] = factoryMethod;
    }
};

export default Cache