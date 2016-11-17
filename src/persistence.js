import Backendless from './backendless'
import DataStore from './data-store'
import utils from './utils'


var Persistence = function(dataStoreCache) {
    this.dataStoreCache = dataStoreCache;
    this.restUrl = Backendless.appPath + '/data/';
};

Persistence.prototype = {

    save: utils.promisified('_save'),

    saveSync: utils.synchronized('_save'),

    _save: function(className, obj, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = !!responder;

        if (utils.isString(className)) {
            var url = this.restUrl + className;
            return Backendless._ajax({
                method      : 'POST',
                url         : url,
                data        : JSON.stringify(obj),
                isAsync     : isAsync,
                asyncHandler: responder
            });
        }

        if (utils.isObject(className)) {
            return new DataStore(className)._save(className, obj, async);
        }
    },

    getView: utils.promisified('_getView'),

    getViewSync: utils.synchronized('_getView'),

    _getView: function(viewName, whereClause, pageSize, offset, async) {
        var responder = utils.extractResponder(arguments),
            isAsync   = responder != null;

        if (utils.isString(viewName)) {
            var url = this.restUrl + viewName;

            if ((arguments.length > 1) && !(arguments[1] instanceof Backendless.Async)) {
                url += '?';
            }
            if (utils.isString(whereClause)) {
                url += 'where=' + whereClause;
            } else {
                pageSize = whereClause;
                offset = pageSize;
            }
            if (utils.isNumber(pageSize)) {
                url += '&' + new DataStore()._extractQueryOptions({
                        pageSize: pageSize
                    });
            }
            if (utils.isNumber(offset)) {
                url += '&' + new DataStore()._extractQueryOptions({
                        offset: offset
                    });
            }

            return Backendless._ajax({
                method      : 'GET',
                url         : url,
                isAsync     : isAsync,
                asyncHandler: responder
            });
        } else {
            throw new Error('View name is required string parameter');
        }
    },

    callStoredProcedure: utils.promisified('_callStoredProcedure'),

    callStoredProcedureSync: utils.synchronized('_callStoredProcedure'),

    _callStoredProcedure: function(spName, argumentValues, async) {
        var responder = utils.extractResponder(arguments),
            isAsync   = responder != null;

        if (utils.isString(spName)) {
            var url  = this.restUrl + spName,
                data = {};

            if (utils.isObject(argumentValues)) {
                data = JSON.stringify(argumentValues);
            }

            return Backendless._ajax({
                method      : 'POST',
                url         : url,
                data        : data,
                isAsync     : isAsync,
                asyncHandler: responder
            });
        } else {
            throw new Error('Stored Procedure name is required string parameter');
        }
    },

    of: function(model) {
        var tableName;
        if (utils.isString(model)) {
            if (model.toLowerCase() === 'users') {
                throw new Error("Table 'Users' is not accessible through this signature. Use Backendless.Data.of( Backendless.User ) instead");
            }
            tableName = model;
        } else {
            tableName = utils.getClassName(model);
        }
        var store = this.dataStoreCache[tableName];
        if (!store) {
            store = new DataStore(model);
            this.dataStoreCache[tableName] = store;
        }

        return store;
    },

    describe: utils.promisified('_describe'),

    describeSync: utils.synchronized('_describe'),

    _describe: function(className, async) {
        className = utils.isString(className) ? className : utils.getClassName(className);
        var responder = utils.extractResponder(arguments), isAsync = (responder != null);

        return Backendless._ajax({
            method      : 'GET',
            url         : this.restUrl + className + '/properties',
            isAsync     : isAsync,
            asyncHandler: responder
        });
    }
};

export default Persistence