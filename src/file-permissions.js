import Backendless from './backendless'
import utils from './utils'

function FilePermissions() {
    this.restUrl = Backendless.appPath + '/files/permissions';
}

FilePermissions.prototype = {
    grantUser: utils.promisified('_grantUser'),

    grantUserSync: utils.synchronized('_grantUser'),

    _grantUser  : function(userId, url, permissionType, async) {
        return this._sendRequest({
            varType: 'user',
            id: userId,
            url: url,
            permissionType: permissionType,
            state: 'GRANT',
            responder: async
        });
    },

    grantRole: utils.promisified('_grantRole'),

    grantRoleSync: utils.synchronized('_grantRole'),

    _grantRole  : function(roleName, url, permissionType, async) {
        return this._sendRequest({
            varType: 'role',
            id: roleName,
            url: url,
            permissionType: permissionType,
            state: 'GRANT',
            responder: async
        });
    },

    grant: utils.promisified('_grant'),

    grantSync: utils.synchronized('_grant'),

    _grant      : function(url, permissionType, async) {
        return this._sendRequest({
            varType: 'user',
            url: url,
            permissionType: permissionType,
            state: 'GRANT',
            responder: async
        });
    },

    denyUser: utils.promisified('_denyUser'),

    denyUserSync: utils.synchronized('_denyUser'),

    _denyUser   : function(userId, url, permissionType, async) {
        return this._sendRequest({
            varType: 'user',
            id: userId,
            url: url,
            permissionType: permissionType,
            state: 'DENY',
            responder: async
        });
    },

    denyRole: utils.promisified('_denyRole'),

    denyRoleSync: utils.synchronized('_denyRole'),

    _denyRole   : function(roleName, url, permissionType, async) {
        return this._sendRequest({
            varType: 'role',
            id: roleName,
            url: url,
            permissionType: permissionType,
            state: 'DENY',
            responder: async
        });
    },

    deny: utils.promisified('_deny'),

    denySync: utils.synchronized('_deny'),

    _deny       : function(url, permissionType, async) {
        return this._sendRequest({
            varType: 'user',
            url: url,
            permissionType: permissionType,
            state: 'DENY',
            responder: async
        });
    },

    _sendRequest: function (options) {
        var type = options.state;
        var url = options.url;
        var responder = options.responder;
        var isAsync = responder != null;
        var data = {
            "permission": options.permissionType
        };

        if (options.varType) {
            data[options.varType] = options.id || "*";
        }

        return Backendless._ajax({
            method: 'PUT',
            url: this.restUrl + '/' + type + '/' + encodeURIComponent(url),
            data: JSON.stringify(data),
            isAsync: isAsync,
            asyncHandler: responder
        });
    }
};

export default FilePermissions
