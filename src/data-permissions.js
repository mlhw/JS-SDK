import Backendless from './backendless'
import utils from './utils'

function DataPermissions() {
    this.FIND = new DataPermission('FIND');
    this.REMOVE = new DataPermission('REMOVE');
    this.UPDATE = new DataPermission('UPDATE')
}

function DataPermission(permission) {
    this.permission = permission;
    this.restUrl = Backendless.appPath + '/data';
}

DataPermission.prototype = {

    grantUser: utils.promisified('_grantUser'),

    grantUserSync: utils.synchronized('_grantUser'),

    _grantUser: function (userId, dataObject, async) {
        return this._sendRequest({
            userId: userId,
            dataObject: dataObject,
            responder: async,
            permissionType: 'GRANT'
        });
    },

    grantRole: utils.promisified('_grantRole'),

    grantRoleSync: utils.synchronized('_grantRole'),

    _grantRole: function (roleName, dataObject, async) {
        return this._sendRequest({
            roleName: roleName,
            dataObject: dataObject,
            responder: async,
            permissionType: 'GRANT'
        });
    },

    grant: utils.promisified('_grant'),

    grantSync: utils.synchronized('_grant'),

    _grant: function (dataObject, async) {
        return this._sendRequest({
            userId: '*',
            dataObject: dataObject,
            responder: async,
            permissionType: 'GRANT'
        });
    },

    denyUser: utils.promisified('_denyUser'),

    denyUserSync: utils.synchronized('_denyUser'),

    _denyUser: function (userId, dataObject, async) {
        return this._sendRequest({
            userId: userId,
            dataObject: dataObject,
            responder: async,
            permissionType: 'DENY'
        });
    },

    denyRole: utils.promisified('_denyRole'),

    denyRoleSync: utils.synchronized('_denyRole'),

    _denyRole: function (roleName, dataObject, async) {
        return this._sendRequest({
            roleName: roleName,
            dataObject: dataObject,
            responder: async,
            permissionType: 'DENY'
        });
    },

    deny: utils.promisified('_deny'),

    denySync: utils.synchronized('_deny'),

    _deny: function (dataObject, async) {
        return this._sendRequest({
            userId: '*',
            dataObject: dataObject,
            responder: async,
            permissionType: 'DENY'
        });
    },

    _getRestUrl: function(dataObject, permissionType) {
       return (
           this.restUrl + '/' +
           encodeURIComponent(dataObject.___class) + '/permissions/' +
           permissionType + '/' +
           encodeURIComponent(dataObject.objectId)
       );
    },

    _sendRequest: function(options) {
        var dataObject = options.dataObject;
        var userId = options.userId;
        var roleName = options.roleName;
        var responder = options.responder;

        var isAsync = !!responder;
        var data = {
            "permission": this.permission
        };

        if (!dataObject.___class || !dataObject.objectId) {
            throw new Error('"dataObject.___class" and "dataObject.objectId" need to be specified');
        }

        if (userId) {
            data.user = userId;
        } else if (roleName) {
            data.role = roleName;
        }

        return Backendless._ajax({
            method      : 'PUT',
            url         : this._getRestUrl(dataObject, options.permissionType),
            data        : JSON.stringify(data),
            isAsync     : isAsync,
            asyncHandler: responder
        });
    }
};

export default DataPermissions