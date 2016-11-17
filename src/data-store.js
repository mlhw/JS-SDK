import Backendless from './backendless'
import LoadRelationsQueryBuilder from './load-relations-query-builder'
import utils from './utils'

function DataStore(model) {
    this.model = utils.isString(model) ? function() {} : model;

    this.className = utils.getClassName(model);

    if ((typeof model).toLowerCase() === "string") {
        this.className = model;
    }

    if (!this.className) {
        throw 'Class name should be specified';
    }

    this.restUrl = Backendless.appPath + '/data/' + this.className;
    this.bulkRestUrl = Backendless.appPath + '/data/bulk/' + this.className;
}

DataStore.prototype = {
    _extractQueryOptions: function(options) {
        var params = [];

        if (typeof options.pageSize != 'undefined') {
            if (options.pageSize < 1 || options.pageSize > 100) {
                throw new Error('PageSize can not be less then 1 or greater than 100');
            }

            params.push('pageSize=' + utils.encodeURIComponent(options.pageSize));
        }

        if (typeof options.offset != 'undefined') {
            if (options.offset < 0) {
                throw new Error('Offset can not be less then 0');
            }

            params.push('offset=' + utils.encodeURIComponent(options.offset));
        }

        if (options.sortBy) {
            if (utils.isString(options.sortBy)) {
                params.push('sortBy=' + encodeURIComponent(options.sortBy));
            } else if (utils.isArray(options.sortBy)) {
                params.push('sortBy=' + utils.encodeArrayToUriComponent(options.sortBy));
            }
        }

        if (options.relationsDepth) {
            if (utils.isNumber(options.relationsDepth)) {
                params.push('relationsDepth=' + Math.floor(options.relationsDepth));
            }
        }

        if (options.relations) {
            if (utils.isArray(options.relations)) {
                params.push('loadRelations=' + (options.relations.length ? utils.encodeArrayToUriComponent(options.relations) : "*"));
            }
        }

        return params.join('&');
    },
    _parseResponse: function(response) {
        var _Model = this.model, item;
        response = response.fields || response;
        item = new _Model();

        utils.deepExtend(item, response);
        return this._formCircDeps(item);
    },

    _parseFindResponse: function(response, model) {
        var _Model = model === undefined ? this.model : model;
        var result;

        var sanitizeResponseItem = function(response) {
            var item = utils.isFunction(_Model) ? new _Model() : {};

            response  = response.fields || response;

            return utils.deepExtend(item, response);
        };

        if (utils.isArray(response)) {
            result = utils.map(response, sanitizeResponseItem);
        } else {
            result = sanitizeResponseItem(response);
        }

        return this._formCircDeps(result);
    },

    _load: function(url, async) {
        if (url) {
            var responder = utils.extractResponder(arguments), isAsync = false;

            if (responder != null) {
                isAsync = true;
                responder = utils.wrapAsync(responder, this._parseResponse, this);
            }

            var result = Backendless._ajax({
                method      : 'GET',
                url         : url,
                isAsync     : isAsync,
                asyncHandler: responder
            });

            return isAsync ? result : this._parseResponse(result);
        }
    },

    _replCircDeps       : function(obj) {
        var objMap = [obj];
        var pos;

        var genID = function() {
            for (var b = '', a = b; a++ < 36; b += a * 51 && 52 ? (a ^ 15 ? 8 ^ Math.random() * (a ^ 20 ? 16 : 4) : 4).toString(16) : '-') {
            }
            return b;
        };

        var _replCircDepsHelper = function(obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop) && typeof obj[prop] == "object" && obj[prop] != null) {
                    if ((pos = objMap.indexOf(obj[prop])) != -1) {
                        objMap[pos]["__subID"] = objMap[pos]["__subID"] || genID();
                        obj[prop] = {"__originSubID": objMap[pos]["__subID"]};
                    } else if (utils.isDate(obj[prop])) {
                        obj[prop] = obj[prop].getTime();
                    } else {
                        objMap.push(obj[prop]);
                        _replCircDepsHelper(obj[prop]);
                    }
                }
            }
        };

        _replCircDepsHelper(obj);
    },

    _formCircDeps: function(obj) {
        var circDepsIDs         = {},
            result              = new obj.constructor(),
            _formCircDepsHelper = function(obj, result) {
                if (obj.hasOwnProperty("__subID")) {
                    circDepsIDs[obj["__subID"]] = result;
                    delete obj["__subID"];
                }

                for (var prop in obj) {
                    if (obj.hasOwnProperty(prop)) {
                        if (typeof obj[prop] == "object" && obj[prop] != null) {
                            if (obj[prop].hasOwnProperty("__originSubID")) {
                                result[prop] = circDepsIDs[obj[prop]["__originSubID"]];
                            } else {
                                result[prop] = new (obj[prop].constructor)();
                                _formCircDepsHelper(obj[prop], result[prop]);
                            }
                        } else {
                            result[prop] = obj[prop];
                        }
                    }
                }
            };

        _formCircDepsHelper(obj, result);
        return result;
    },

    save: utils.promisified('_save'),

    saveSync: utils.synchronized('_save'),

    _save: function(obj, async) {
        this._replCircDeps(obj);
        var responder = utils.extractResponder(arguments),
            isAsync   = false,
            method    = 'PUT',
            url       = this.restUrl,
            objRef    = obj;

        if (responder != null) {
            isAsync = true;
            responder = utils.wrapAsync(responder, this._parseResponse, this);
        }

        var result = Backendless._ajax({
            method      : method,
            url         : url,
            data        : JSON.stringify(obj),
            isAsync     : isAsync,
            asyncHandler: responder
        });

        if (!isAsync) {
            utils.deepExtend(objRef, this._parseResponse(result));
        }

        return isAsync ? result : objRef;
    },

    remove: utils.promisified('_remove'),

    removeSync: utils.synchronized('_remove'),

    _remove: function(objId, async) {
        if (!utils.isObject(objId) && !utils.isString(objId)) {
            throw new Error('Invalid value for the "value" argument. The argument must contain only string or object values');
        }

        var responder = utils.extractResponder(arguments), isAsync = false;

        if (responder != null) {
            isAsync = true;
            responder = utils.wrapAsync(responder, this._parseResponse, this);
        }

        var result;

        if (utils.isString(objId) || objId.objectId) {
            objId = objId.objectId || objId;
            result = Backendless._ajax({
                method      : 'DELETE',
                url         : this.restUrl + '/' + objId,
                isAsync     : isAsync,
                asyncHandler: responder
            });
        } else {
            result = Backendless._ajax({
                method      : 'DELETE',
                url         : this.restUrl,
                data        : JSON.stringify(objId),
                isAsync     : isAsync,
                asyncHandler: responder
            });
        }

        return isAsync ? result : this._parseResponse(result);
    },

    find: utils.promisified('_find'),

    findSync: utils.synchronized('_find'),

    _find: function(queryBuilder) {
        utils.throwError(this._validateFindArguments(arguments));

        var args = this._parseFindArguments(arguments);
        var dataQuery = args.queryBuilder ? queryBuilder.build() : {};

        return this._findUtil(dataQuery, args.async);
    },

    _validateFindArguments: function(args) {
        if (args.length === 0) {
            return;
        }

        if (args.length === 1) {
            if (!(args[0] instanceof Backendless.DataQueryBuilder) && !(args[0] instanceof Backendless.Async)) {
                return (
                    'Invalid find method argument. ' +
                    'The argument should be instance of Backendless.DataQueryBuilder or Backendless.Async'
                );
            }
        } else {
            if (!(args[0] instanceof Backendless.DataQueryBuilder)) {
                return 'Invalid data query builder. The argument should be instance of Backendless.DataQueryBuilder';
            }

            if (!(args[1] instanceof Backendless.Async)) {
                return 'Invalid callback wrapper object. The argument should be instance of Backendless.Async';
            }
        }
    },

    _parseFindArguments: function(args) {
        var result = {
            queryBuilder: args[0] instanceof Backendless.DataQueryBuilder ? args[0] : null,
            async       : args[0] instanceof Backendless.Async ? args[0] : null
        };

        if (args.length > 1) {
            result.async = args[1];
        }

        return result;
    },

    _findUtil: function(dataQuery) {
        dataQuery = dataQuery || {};

        var props,
            whereClause,
            options,
            query     = [],
            url       = this.restUrl,
            responder = utils.extractResponder(arguments),
            isAsync   = responder != null,
            result;

        if (dataQuery.properties && dataQuery.properties.length) {
            props = 'props=' + utils.encodeArrayToUriComponent(dataQuery.properties);
        }

        if (dataQuery.condition) {
            whereClause = 'where=' + encodeURIComponent(dataQuery.condition);
        }

        if (dataQuery.options) {
            options = this._extractQueryOptions(dataQuery.options);
        }

        responder != null && (responder = utils.wrapAsync(responder, this._parseFindResponse, this));
        options && query.push(options);
        whereClause && query.push(whereClause);
        props && query.push(props);
        query = query.join('&');

        if (dataQuery.url) {
            url += '/' + dataQuery.url;
        }

        if (query) {
            url += '?' + query;
        }

        result = Backendless._ajax({
            method      : 'GET',
            url         : url,
            isAsync     : isAsync,
            asyncHandler: responder,
            cachePolicy : dataQuery.cachePolicy
        });

        return isAsync ? result : this._parseFindResponse(result);
    },

    _buildArgsObject: function() {
        var args = {},
            i    = arguments.length,
            type = "";
        for (; i--;) {
            type = Object.prototype.toString.call(arguments[i]).toLowerCase().match(/[a-z]+/g)[1];
            switch (type) {
                case "number":
                    args.options = args.options || {};
                    args.options.relationsDepth = arguments[i];
                    break;
                case "string":
                    args.url = arguments[i];
                    break;
                case "array":
                    args.options = args.options || {};
                    args.options.relations = arguments[i];
                    break;
                case "object":
                    if (arguments[i].hasOwnProperty('cachePolicy')) {
                        args.cachePolicy = arguments[i]['cachePolicy'];
                    }
                    break;
                default:
                    break;
            }
        }

        return args;
    },

    findById: utils.promisified('_findById'),

    findByIdSync: utils.synchronized('_findById'),

    _findById: function() {
        var argsObj;

        if (utils.isString(arguments[0])) {
            argsObj = this._buildArgsObject.apply(this, arguments);
            if (!(argsObj.url)) {
                throw new Error('missing argument "object ID" for method findById()');
            }

            return this._findUtil.apply(this, [argsObj].concat(Array.prototype.slice.call(arguments)));
        } else if (utils.isObject(arguments[0])) {
            argsObj = arguments[0];
            var responder = utils.extractResponder(arguments),
                url       = this.restUrl,
                isAsync   = responder != null,
                send      = "/pk?";

            for (var key in argsObj) {
                send += key + '=' + argsObj[key] + '&';
            }

            responder != null && (responder = utils.wrapAsync(responder, this._parseResponse, this));

            var result;

            if (utils.getClassName(arguments[0]) == 'Object') {
                result = Backendless._ajax({
                    method      : 'GET',
                    url         : url + send.replace(/&$/, ""),
                    isAsync     : isAsync,
                    asyncHandler: responder
                });
            } else {
                result = Backendless._ajax({
                    method      : 'PUT',
                    url         : url,
                    data        : JSON.stringify(argsObj),
                    isAsync     : isAsync,
                    asyncHandler: responder
                });
            }

            return isAsync ? result : this._parseResponse(result);
        } else {
            throw new Error('Invalid value for the "value" argument. The argument must contain only string or object values');
        }
    },


    /**
     * Get related objects
     *
     * @param {string} parentObjectId
     * @param {LoadRelationsQueryBuilder} queryBuilder
     * @param {Async} [async]
     * @returns {Promise}
     */
    loadRelations: utils.promisified('_loadRelations'),

    /**
     * Get related objects (sync)
     *
     * @param {string} parentObjectId
     * @param {LoadRelationsQueryBuilder} queryBuilder
     * @returns {Object[]}
     */
    loadRelationsSync: utils.synchronized('_loadRelations'),

    _loadRelations: function (parentObjectId, queryBuilder, async) {
        utils.throwError(this._validateLoadRelationsArguments(parentObjectId, queryBuilder));

        var dataQuery = queryBuilder.build();
        var relationModel = dataQuery.relationModel || null;
        var responder = utils.extractResponder(arguments);
        var isAsync = !!responder;
        var relationName = dataQuery.options.relationName;
        var query = this._extractQueryOptions(dataQuery.options);
        var url = this.restUrl + utils.toUri(parentObjectId, relationName);

        responder = responder && utils.wrapAsync(responder, function(response){
                return this._parseFindResponse(response, relationModel);
            }, this);

        url += query ? '?' + query : '';

        var result = Backendless._ajax({
            method: 'GET',
            url: url,
            isAsync: isAsync,
            asyncHandler: responder
        });

        return isAsync ? result : this._parseFindResponse(result, relationModel);
    },

    _validateLoadRelationsArguments: function(parentObjectId, queryBuilder) {
        if (!parentObjectId || !utils.isString(parentObjectId)) {
            return 'The parentObjectId is required argument and must be a nonempty string';
        }

        if (!queryBuilder || !(queryBuilder instanceof LoadRelationsQueryBuilder)) {
            return (
                'Invalid queryBuilder object.' +
                'The queryBuilder is required and must be instance of the Backendless.LoadRelationsQueryBuilder'
            );
        }

        var dataQuery = queryBuilder.build();

        var relationName = dataQuery.options && dataQuery.options.relationName;

        if (!relationName || !utils.isString(relationName)) {
            return 'The options relationName is required and must contain string value';
        }
    },

    findFirst: utils.promisified('_findFirst'),

    findFirstSync: utils.synchronized('_findFirst'),

    _findFirst: function() {
        var argsObj = this._buildArgsObject.apply(this, arguments);
        argsObj.url = 'first';

        return this._findUtil.apply(this, [argsObj].concat(Array.prototype.slice.call(arguments)));
    },

    findLast: utils.promisified('_findLast'),

    findLastSync: utils.synchronized('_findLast'),

    _findLast: function() {
        var argsObj = this._buildArgsObject.apply(this, arguments);
        argsObj.url = 'last';

        return this._findUtil.apply(this, [argsObj].concat(Array.prototype.slice.call(arguments)));
    },

    /**
     * Count of object
     *
     * @param {DataQuery} [dataQuery]
     *
     * @return {Promise}
     */
    getObjectCount: utils.promisified('_getObjectCount'),

    /**
     * Count of object (sync)
     *
     * @param {DataQuery} [dataQuery]
     *
     * @return {number}
     */
    getObjectCountSync: utils.synchronized('_getObjectCount'),

    _getObjectCount: function(dataQuery, async) {
        dataQuery = dataQuery || {};

        var url       = this.restUrl + '/count';
        var responder = utils.extractResponder(arguments);
        var isAsync   = responder != null;

        if (dataQuery.condition) {
            url += '?where=' + encodeURIComponent(dataQuery.condition);
        }

        return Backendless._ajax({
            method      : 'GET',
            url         : url,
            isAsync     : isAsync,
            asyncHandler: responder,
            cachePolicy : dataQuery.cachePolicy
        });
    },

    /**
     * Create of several objects
     *
     * @param {object[]} objectsArray - array of objects
     * @returns {Promise}
     */
    bulkCreate: utils.promisified('_bulkCreate'),

    /**
     * Create of several objects (sync)
     *
     * @param {object[]} objectsArray - array of objects
     * @returns {*}
     */
    bulkCreateSync: utils.synchronized('_bulkCreate'),

    _bulkCreate: function(objectsArray, async) {
        utils.throwError(this._validateBulkCreateArg(objectsArray));

        return Backendless._ajax({
            method      : 'POST',
            url         : this.bulkRestUrl,
            data        : JSON.stringify(objectsArray),
            isAsync     : !!async,
            asyncHandler: async
        });
    },

    /**
     * Update of several objects by template
     *
     * @param {object} templateObject
     * @param {string} whereClause
     * @returns {Promise}
     */
    bulkUpdate: utils.promisified('_bulkUpdate'),

    /**
     * Update of several objects by template (sync)
     *
     * @param {object} templateObject
     * @param {string} whereClause
     * @returns {*}
     */
    bulkUpdateSync: utils.synchronized('_bulkUpdate'),

    _bulkUpdate: function(templateObject, whereClause, async) {
        utils.throwError(this._validateBulkUpdateArgs(templateObject, whereClause));

        return Backendless._ajax({
            method      : 'PUT',
            url         : utils.addWhereClause(this.bulkRestUrl, whereClause),
            data        : JSON.stringify(templateObject),
            isAsync     : !!async,
            asyncHandler: async
        });
    },

    /**
     * Delete of several objects
     *
     * @param {(string|string[]|object[])} objectsArray - whereClause string or array of object ids or array of objects
     * @returns {Promise}
     */

    bulkDelete: utils.promisified('_bulkDelete'),

    /**
     * Delete of several objects (sync)
     *
     * @param {(string|string[]|object[])} objectsArray - whereClause string or array of object ids or array of objects
     * @returns {*}
     */
    bulkDeleteSync: utils.synchronized('_bulkDelete'),

    _bulkDelete: function(objectsArray, async) {
        utils.throwError(this._validateBulkDeleteArg(objectsArray));

        var whereClause;
        var objects;

        if (utils.isString(objectsArray)) {
            whereClause = objectsArray;
        } else if (utils.isArray(objectsArray)) {
            objects = utils.map(objectsArray, function(obj) {
                return utils.isString(obj) ? obj : obj.objectId;
            });
        }

        return Backendless._ajax({
            method      : 'DELETE',
            url         : utils.addWhereClause(this.bulkRestUrl, whereClause),
            data        : objects && JSON.stringify(objects),
            isAsync     : !!async,
            asyncHandler: async
        });
    },

    _validateBulkCreateArg: function(objectsArray) {
        var MSG_ERROR = (
            'Invalid value for the "objectsArray" argument. ' +
            'The argument must contain only array of objects.'
        );

        if (!utils.isArray(objectsArray)) {
            return MSG_ERROR;
        }

        for(var i=0; i < objectsArray.length; i++) {
            if (!utils.isObject(objectsArray[i])) {
                return MSG_ERROR;
            }
        }
    },


    _validateBulkUpdateArgs: function(templateObject, whereClause) {
        if (!templateObject || !utils.isObject(templateObject)) {
            return 'Invalid templateObject argument. The first argument must contain object';
        }

        if (!whereClause || !utils.isString(whereClause)) {
            return 'Invalid whereClause argument. The first argument must contain "whereClause" string.';
        }
    },

    _validateBulkDeleteArg: function(arg) {
        var MSG_ERROR = (
            'Invalid bulkDelete argument. ' +
            'The first argument must contain array of objects or array of id or "whereClause" string'
        );

        if (!arg) {
            return MSG_ERROR;
        }

        if (!utils.isArray(arg) && !utils.isString(arg)) {
            return MSG_ERROR;
        }

        for(var i=0; i < arg.length; i++) {
            if (!utils.isObject(arg[i]) && !utils.isString(arg[i])) {
                return MSG_ERROR;
            }
        }
    },

    /**
     * Defining the relation
     *
     * @param {string} columnName
     * @param {string} childTableName
     * @param {string} cardinality
     * @returns {Promise}
     **/

    declareRelation: utils.promisified('_declareRelation'),

    /**
     * Defining the relation (sync)
     *
     * @param {string} columnName
     * @param {string} childTableName
     * @param {string} cardinality
     * @returns {*}
     **/
    declareRelationSync: utils.synchronized('_declareRelation'),

    _declareRelation: function(columnName, childTableName, cardinality, async) {
        var responder = utils.extractResponder(arguments);

        utils.throwError(this._validateDeclareRelationArgs(columnName, childTableName, cardinality));

        return Backendless._ajax({
            method      : 'POST',
            url         : this.restUrl + utils.toUri(columnName, childTableName, cardinality),
            isAsync     : !!responder,
            asyncHandler: responder
        });
    },

    _validateDeclareRelationArgs: function(columnName, childTableName, cardinality) {
        var existsAndString = function (value) {
            return !!value && utils.isString(value);
        };

        if (!existsAndString(columnName)) {
            return (
                'Invalid value for the "columnName" argument. ' +
                'The argument is required and must contain only string values.'
            );
        }

        if (!existsAndString(childTableName)) {
            return (
                'Invalid value for the "childTableName" argument. ' +
                'The argument is required and must contain only string values.'
            );
        }

        if (!existsAndString(cardinality) || (cardinality !== 'one-to-one' && cardinality !== 'one-to-many')) {
            return (
                'Invalid value for the "cardinality" argument. ' +
                'The argument is required and must contain string values ' +
                '("one-to-one" or "one-to-many").'
            );
        }
    },

    /**
     * Set relations
     *
     * @param {object} parentObject,
     * @param {string} columnName
     * @param {object[]|string[]|string} childObjectsArray|childObjectIdArray|whereClause
     * @returns {Promise}
     **/

    setRelation: utils.promisified('_setRelation'),


    /**
     * Set relations (sync)
     *
     * @param {object} parentObject,
     * @param {string} columnName
     * @param {object[]|string[]|string} childObjectsArray|childObjectIdArray|whereClause
     * @returns {*}
     **/
    setRelationSync: utils.synchronized('_setRelation'),

    _setRelation: function() {
        return this._manageRelation('POST', arguments);
    },

    /**
     * Add relations
     *
     * @param {object} parentObject,
     * @param {string} columnName
     * @param {object[]|string[]|string} childObjectsArray|childObjectIdArray|whereClause
     * @returns {Promise}
     **/
    addRelation: utils.promisified('_addRelation'),


    /**
     * Add relations (sync)
     *
     * @param {object} parentObject,
     * @param {string} columnName
     * @param {object[]|string[]|string} childObjectsArray|childObjectIdArray|whereClause
     * @returns {*}
     **/
    addRelationSync: utils.synchronized('_addRelation'),

    _addRelation: function() {
        return this._manageRelation('PUT', arguments);
    },

    /**
     * Delete relations
     *
     * @param {object} parentObject,
     * @param {string} columnName
     * @param {object[]|string[]|string} childObjectsArray|childObjectIdArray|whereClause
     * @returns {Promise}
     **/
    deleteRelation: utils.promisified('_deleteRelation'),


    /**
     * Delete relations
     *
     * @param {object} parentObject,
     * @param {string} columnName
     * @param {object[]|string[]|string} childObjectsArray|childObjectIdArray|whereClause
     * @returns {*}
     **/
    deleteRelationSync: utils.synchronized('_deleteRelation'),

    _deleteRelation: function() {
        return this._manageRelation('DELETE', arguments);
    },

    _formRelationObject: function (args) {
        var relation = {
            columnName: args[1]
        };

        var parent = args[0];
        var child;

        if (utils.isString(parent)) {
            relation.parentId = parent
        } else if (utils.isObject(parent)) {
            relation.parentId = parent.objectId
        }

        var children = args[2];

        if (utils.isString(children)) {
            relation.whereClause = children
        } else if (utils.isArray(children)) {
            relation.childrenIds = [];

            for (var i = 0; i < children.length; i++) {
                child = children[i];

                if (utils.isString(child)) {
                    relation.childrenIds.push(child)
                } else if (utils.isObject(child)) {
                    relation.childrenIds.push(child.objectId)
                }

            }
        }

        return relation;
    },

    _validateRelationObject: function(relation) {
        if (!relation.parentId) {
            return (
                'Invalid value for the "parent" argument. ' +
                'The argument is required and must contain only string or object values.'
            );
        }

        if (!relation.columnName) {
            return (
                'Invalid value for the "columnName" argument. ' +
                'The argument is required and must contain only string values.'
            );
        }

        if (!relation.whereClause && !relation.childrenIds) {
            return (
                'Invalid value for the third argument. ' +
                'The argument is required and must contain string values if it sets whereClause ' +
                'or array if it sets childObjects.'
            );
        }
    },

    _manageRelation: function(method, args) {
        var relation = this._formRelationObject(args);
        var responder = utils.extractResponder(args);
        var validationError = this._validateRelationObject(relation);

        if (validationError) {
            throw new Error(validationError);
        }

        return Backendless._ajax({
            method      : method,
            url         : this._buildRelationUrl(relation),
            isAsync     : !!responder,
            asyncHandler: responder,
            data        : relation.childrenIds && JSON.stringify(relation.childrenIds)
        });
    },

    _buildRelationUrl: function (relation) {
        var url = this.restUrl + utils.toUri(relation.parentId, relation.columnName);

        return utils.addWhereClause(url, relation.whereClause);
    }
};

export default DataStore