import Async from './async'

var Utils = {
    isObject: function (obj) {
        return obj === Object(obj);
    },

    isString: function (obj) {
        return Object.prototype.toString.call(obj).slice(8, -1) === 'String';
    },

    isNumber: function (obj) {
        return Object.prototype.toString.call(obj).slice(8, -1) === 'Number';
    },

    isFunction: function (obj) {
        return Object.prototype.toString.call(obj).slice(8, -1) === 'Function';
    },

    isBoolean: function (obj) {
        return Object.prototype.toString.call(obj).slice(8, -1) === 'Boolean';
    },

    isDate: function (obj) {
        return Object.prototype.toString.call(obj).slice(8, -1) === 'Date';
    },

    isArray: (Array.isArray || function (obj) {
        return Object.prototype.toString.call(obj).slice(8, -1) === 'Array';
    }),

    /**
     * @param {*} value
     * @returns {Array}
     */
    castArray: function (value) {
        if (Utils.isArray(value)) {
            return value;
        }

        return [value];
    },

    addEvent: function (evnt, elem, func) {
        if (elem.addEventListener) {
            elem.addEventListener(evnt, func, false);
        }
        else if (elem.attachEvent) {
            elem.attachEvent("on" + evnt, func);
        }
        else {
            elem[evnt] = func;
        }
    },

    isEmpty: function (obj) {
        if (obj == null) {
            return true;
        }
        if (this.isArray(obj) || this.isString(obj)) {
            return obj.length === 0;
        }
        for (var key in obj) {
            if (obj.hasOwnProperty(key) && obj[key] !== undefined && obj[key] !== null) {
                return false;
            }
        }

        return true;
    },

    removeEvent: function (evnt, elem) {
        if (elem.removeEventListener) {
            elem.removeEventListener(evnt, null, false);
        } else if (elem.detachEvent) {
            elem.detachEvent("on" + evnt, null);
        } else {
            elem[evnt] = null;
        }
    },

    /**
     * @param {Array} array
     * @param {function|string} iteratee
     * @returns {Array}
     */
    map: function (array, iteratee) {
        var result = [];
        var item;

        if (this.isArray(array)) {
            for (var i = 0; i < array.length; i++) {
                item = array[i];

                if (this.isFunction(iteratee)) {
                    item = iteratee(item);
                } else if (this.isString(iteratee) && this.isObject(item)) {
                    item = item[iteratee];
                }

                result.push(item);
            }
        }

        return result;
    },

    /**
     * @param {string} errorMessage
     */
    throwError: function (errorMessage) {
        if (errorMessage) {
            throw new Error(errorMessage);
        }
    },

    /**
     * @param {stirng} url
     * @param {string} whereClause
     * @returns {string}
     */
    addWhereClause: function (url, whereClause) {
        if (whereClause) {
            url += '?where=' + encodeURIComponent(whereClause);
        }

        return url;
    },

    /**
     * @returns {string}
     */
    toUri: function () {
        var uri = '';
        var arg;

        for (var i = 0; i < arguments.length; i++) {
            arg = arguments[i];

            if (!arg) {
                continue;
            }

            if (this.isArray(arg)) {
                uri += this.toUri.apply(this, arg);
            } else if (this.isString(arg)) {
                uri += '/';
                uri += this.encodeURIComponent(arg);
            }
        }

        return uri;
    },

    getClassName: function (object) {
        if (object.prototype && object.prototype.___class) {
            return object.prototype.___class;
        }

        if (this.isFunction(object) && object.name) {
            return object.name;
        }

        var instStringified = (this.isFunction(object) ? this.toString() : object.constructor.toString()),
            results = instStringified.match(/function\s+(\w+)/);

        return (results && results.length > 1) ? results[1] : '';
    },

    encodeArrayToUriComponent: function (arr) {
        var props = [], i, len;
        for (i = 0, len = arr.length; i < len; ++i) {
            props.push(encodeURIComponent(arr[i]));
        }

        return props.join(',');
    },

    classWrapper: function (obj) {
        var wrapper = function (obj) {
            var wrapperName = null,
                Wrapper = null;

            for (var property in obj) {
                if (obj.hasOwnProperty(property)) {
                    if (property === "___class") {
                        wrapperName = obj[property];
                        break;
                    }
                }
            }

            if (wrapperName) {
                try {
                    Wrapper = eval(wrapperName);
                    obj = Utils.deepExtend(new Wrapper(), obj);
                } catch (e) {
                }
            }

            return obj;
        };

        if (this.isObject(obj) && obj != null) {
            if (this.isArray(obj)) {
                for (var i = obj.length; i--;) {
                    obj[i] = wrapper(obj[i]);
                }
            } else {
                obj = wrapper(obj);
            }
        }

        return obj;
    },

    deepExtend: function (destination, source) {
        for (var property in source) {
            if (source[property] !== undefined && source.hasOwnProperty(property)) {
                destination[property] = destination[property] || {},
                    destination[property] = classWrapper(source[property]);
                if (destination[property] && destination[property].hasOwnProperty(property) && destination[property][property] && destination[property][property].hasOwnProperty("__originSubID")) {
                    destination[property][property] = classWrapper(destination[property]);
                }
            }
        }

        return destination;
    },

    cloneObject: function (obj) {
        return this.isArray(obj) ? obj.slice() : this.deepExtend({}, obj);
    },

    extractResponder: function (args) {
        var i, len;
        for (i = 0, len = args.length; i < len; ++i) {
            if (args[i] instanceof Async) {
                return args[i];
            }
        }

        return null;
    },

    wrapAsync: function (async, parser, context) {
        var success = function (data) {
            if (parser) {
                data = parser.call(context, data);
            }

            async.success(data);
        };

        var error = function (data) {
            async.fault(data);
        };

        return new Async(success, error);
    },

    promisified: function (methodName) {
        return function () {
            var args = [].slice.call(arguments);
            var context = this;
            var fn = context[methodName];

            return new Promise(function (resolve, reject) {
                args.push(new Async(resolve, reject, context));
                fn.apply(context, args);
            });
        };
    },

    synchronized: function (methodName) {
        return function () {
            console.warn('Using of sync methods is an outdated approach. Please, use async methods.');

            var context = this;
            var fn = context[methodName];

            return fn.apply(context, arguments);
        };
    },

    emptyFn: function() {
        return (function() {});
    },

    getNow: function() {
        return new Date().getTime();
    }
};

export default Utils;