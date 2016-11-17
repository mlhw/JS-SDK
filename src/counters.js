import Backendless from './backendless'
import utils from './utils'

var Counter = function (name, restUrl) {
    this._nameValidation(name);

    this.restUrl = restUrl;
    this.name = name;
};

Counter.prototype = {
    _nameValidation: function (name) {
        if (!name) {
            throw new Error('Missing value for the "counterName" argument. The argument must contain a string value.');
        }

        if (!utils.isString(name)) {
            throw new Error('Invalid value for the "value" argument. The argument must contain only string values');
        }
    },

    _implementMethod: function (method, urlPart, async) {
        var responder = utils.extractResponder(arguments), isAsync = false;

        if (responder != null) {
            isAsync = true;
            responder = utils.wrapAsync(responder);
        }

        return Backendless._ajax({
            method: method,
            url: this.restUrl + this.name + urlPart,
            isAsync: isAsync,
            asyncHandler: responder
        });
    },

    _implementMethodWithValue: function (urlPart, value, async) {
        if (!value) {
            throw new Error('Missing value for the "value" argument. The argument must contain a numeric value.');
        }

        if (!utils.isNumber(value)) {
            throw new Error('Invalid value for the "value" argument. The argument must contain only numeric values');
        }

        var responder = utils.extractResponder(arguments), isAsync = false;

        if (responder != null) {
            isAsync = true;
            responder = utils.wrapAsync(responder);
        }

        return Backendless._ajax({
            method: 'PUT',
            url: this.restUrl + this.name + urlPart + ((value) ? value : ''),
            isAsync: isAsync,
            asyncHandler: responder
        });
    },

    incrementAndGet: utils.promisified('_incrementAndGet'),

    incrementAndGetSync: utils.synchronized('_incrementAndGet'),

    _incrementAndGet: function (async) {
        return this._implementMethod('PUT', '/increment/get', async);
    },

    getAndIncrement: utils.promisified('_getAndIncrement'),

    getAndIncrementSync: utils.synchronized('_getAndIncrement'),

    _getAndIncrement: function (async) {
        return this._implementMethod('PUT', '/get/increment', async);
    },

    decrementAndGet: utils.promisified('_decrementAndGet'),

    decrementAndGetSync: utils.synchronized('_decrementAndGet'),

    _decrementAndGet: function (async) {
        return this._implementMethod('PUT', '/decrement/get', async);
    },

    getAndDecrement: utils.promisified('_getAndDecrement'),

    getAndDecrementSync: utils.synchronized('_getAndDecrement'),

    _getAndDecrement: function (async) {
        return this._implementMethod('PUT', '/get/decrement', async);
    },

    reset: utils.promisified('_reset'),

    resetSync: utils.synchronized('_reset'),

    _reset: function (async) {
        return this._implementMethod('PUT', '/reset', async);
    },

    get: utils.promisified('_get'),

    getSync: utils.synchronized('_get'),

    _get: function (async) {
        var responder = utils.extractResponder(arguments), isAsync = false;

        if (responder != null) {
            isAsync = true;
            responder = utils.wrapAsync(responder);
        }

        return Backendless._ajax({
            method: 'GET',
            url: this.restUrl + this.name,
            isAsync: isAsync,
            asyncHandler: responder
        });
    },

    addAndGet: utils.promisified('_addAndGet'),

    addAndGetSync: utils.synchronized('_addAndGet'),

    _addAndGet: function (value, async) {
        return this._implementMethodWithValue('/get/incrementby?value=', value, async);
    },

    getAndAdd: utils.promisified('_getAndAdd'),

    getAndAddSync: utils.synchronized('_getAndAdd'),

    _getAndAdd: function (value, async) {
        return this._implementMethodWithValue('/incrementby/get?value=', value, async);
    },

    compareAndSet: utils.promisified('_compareAndSet'),

    compareAndSetSync: utils.synchronized('_compareAndSet'),

    _compareAndSet: function (expected, updated, async) {
        if (!expected || !updated) {
            throw new Error('Missing values for the "expected" and/or "updated" arguments. The arguments must contain numeric values');
        }

        if (!utils.isNumber(expected) || !utils.isNumber(updated)) {
            throw new Error('Missing value for the "expected" and/or "updated" arguments. The arguments must contain a numeric value');
        }

        var responder = utils.extractResponder(arguments), isAsync = false;

        if (responder != null) {
            isAsync = true;
            responder = utils.wrapAsync(responder);
        }

        return Backendless._ajax({
            method: 'PUT',
            url: this.restUrl + this.name + '/get/compareandset?expected=' + ((expected && updated) ? expected + '&updatedvalue=' + updated : ''),
            isAsync: isAsync,
            asyncHandler: responder
        });
    }
};

var Counters = function () {
    this.restUrl = Backendless.appPath + '/counters/';
};

Counters.prototype = {
    of: function (name) {
        return new Counter(name, this.restUrl);
    }
};

for (var methodName in Counter.prototype) {
    if (Counter.prototype.hasOwnProperty(methodName) && methodName[0] !== '_') {
        Counters.prototype[methodName] = createCounterMethodInvoker(methodName);
    }
}

function createCounterMethodInvoker(methodName) {
    return function(name) {
        var counter = this.of(name);
        var args = Array.prototype.slice.call(arguments, 1);

        return counter[methodName].apply(counter, args);
    }
}

export default Counters