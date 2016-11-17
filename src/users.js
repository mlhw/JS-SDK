import Backendless from './backendless'
import Async from './async'
import Persistence from './persistence'
import User from './user'
import utils from './utils'


var UserService = function() {
    this.restUrl = Backendless.appPath + '/users';
};

UserService.prototype = {
    _wrapAsync: function(async, stayLoggedIn) {
        var me   = this, success = function(data) {
            currentUser = me._parseResponse(tryParseJSON(data), stayLoggedIn);
            async.success(me._getUserFromResponse(currentUser));
        }, error = function(data) {
            async.fault(data);
        };

        return new Async(success, error);
    },

    _parseResponse: function(data, stayLoggedIn) {
        var user = User();
        utils.deepExtend(user, data);

        if (stayLoggedIn) {
            Backendless.LocalCache.set("stayLoggedIn", stayLoggedIn);
        }

        return user;
    },

    register: utils.promisified('_register'),

    registerSync: utils.synchronized('_register'),

    _register: function(user, async) {
        if (!(user instanceof User)) {
            throw new Error('Only Backendless.User accepted');
        }

        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        if (responder) {
            responder = this._wrapAsync(responder);
        }

        var result = Backendless._ajax({
            method      : 'POST',
            url         : this.restUrl + '/register',
            isAsync     : isAsync,
            asyncHandler: responder,
            data        : JSON.stringify(user)
        });

        return isAsync ? result : this._parseResponse(result);
    },

    getUserRoles: utils.promisified('_getUserRoles'),

    getUserRolesSync: utils.synchronized('_getUserRoles'),

    _getUserRoles: function(async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        if (responder) {
            responder = this._wrapAsync(responder);
        }

        var result = Backendless._ajax({
            method      : 'GET',
            url         : this.restUrl + '/userroles',
            isAsync     : isAsync,
            asyncHandler: responder
        });

        return isAsync ? result : this._parseResponse(result);
    },

    _roleHelper: function(identity, rolename, async, operation) {
        if (!identity) {
            throw new Error('User identity can not be empty');
        }

        if (!rolename) {
            throw new Error('Rolename can not be empty');
        }

        var responder = utils.extractResponder(arguments);

        return Backendless._ajax({
            method      : 'POST',
            url         : this.restUrl + '/' + operation,
            isAsync     : !!responder,
            asyncHandler: responder,
            data        : JSON.stringify({user : identity, roleName: rolename})
        });
    },

    assignRole: utils.promisified('_assignRole'),

    assignRoleSync: utils.synchronized('_assignRole'),

    _assignRole: function(identity, rolename, async) {
        return this._roleHelper(identity, rolename, async, 'assignRole');
    },

    unassignRole: utils.promisified('_unassignRole'),

    unassignRoleSync: utils.synchronized('_unassignRole'),

    _unassignRole: function(identity, rolename, async) {
        return this._roleHelper(identity, rolename, async, 'unassignRole');
    },

    login: utils.promisified('_login'),

    loginSync: utils.synchronized('_login'),

    _login: function(username, password, stayLoggedIn, async) {
        if (!username) {
            throw new Error('Username can not be empty');
        }

        if (!password) {
            throw new Error('Password can not be empty');
        }

        stayLoggedIn = stayLoggedIn === true;

        Backendless.LocalCache.remove("user-token");
        Backendless.LocalCache.remove("current-user-id");
        Backendless.LocalCache.set("stayLoggedIn", false);

        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        if (responder) {
            responder = this._wrapAsync(responder, stayLoggedIn);
        }

        var data = {
            login   : username,
            password: password
        };

        var result = Backendless._ajax({
            method      : 'POST',
            url         : this.restUrl + '/login',
            isAsync     : isAsync,
            asyncHandler: responder,
            data        : JSON.stringify(data)
        });

        if (!isAsync && result) {
            currentUser = this._parseResponse(result, stayLoggedIn);
            result = this._getUserFromResponse(currentUser);
        }

        return result;
    },

    _getUserFromResponse: function(user) {
        Backendless.LocalCache.set("current-user-id", user.objectId);

        var newUser = new User();

        for (var i in user) {
            if (user.hasOwnProperty(i)) {
                if (i == 'user-token') {
                    if (Backendless.LocalCache.get("stayLoggedIn")) {
                        Backendless.LocalCache.set("user-token", user[i]);
                    }
                    continue;
                }
                newUser[i] = user[i];
            }
        }

        return newUser;
    },

    loggedInUser: function() {
        return Backendless.LocalCache.get("current-user-id");
    },

    describeUserClass: utils.promisified('_describeUserClass'),

    describeUserClassSync: utils.synchronized('_describeUserClass'),

    _describeUserClass: function(async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        return Backendless._ajax({
            method      : 'GET',
            url         : this.restUrl + '/userclassprops',
            isAsync     : isAsync,
            asyncHandler: responder
        });
    },

    restorePassword: utils.promisified('_restorePassword'),

    restorePasswordSync: utils.synchronized('_restorePassword'),

    _restorePassword: function(emailAddress, async) {
        if (!emailAddress) {
            throw 'Username can not be empty';
        }
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        return Backendless._ajax({
            method      : 'GET',
            url         : this.restUrl + '/restorepassword/' + encodeURIComponent(emailAddress),
            isAsync     : isAsync,
            asyncHandler: responder
        });
    },

    logout: utils.promisified('_logout'),

    logoutSync: utils.synchronized('_logout'),

    _logout: function(async) {
        var responder       = utils.extractResponder(arguments),
            isAsync         = responder != null,
            errorCallback   = isAsync ? responder.fault : null,
            successCallback = isAsync ? responder.success : null,
            result = {},

            logoutUser      = function() {
                Backendless.LocalCache.remove("user-token");
                Backendless.LocalCache.remove("current-user-id");
                Backendless.LocalCache.remove("stayLoggedIn");
                currentUser = null;
            },

            onLogoutSuccess = function() {
                logoutUser();
                if (utils.isFunction(successCallback)) {
                    successCallback();
                }
            },

            onLogoutError   = function(e) {
                if (utils.isObject(e) && [3064, 3091, 3090, 3023].indexOf(e.code) != -1) {
                    logoutUser();
                }
                if (utils.isFunction(errorCallback)) {
                    errorCallback(e);
                }
            };

        if (responder) {
            responder.fault = onLogoutError;
            responder.success = onLogoutSuccess;
        }

        try {
            result = Backendless._ajax({
                method      : 'GET',
                url         : this.restUrl + '/logout',
                isAsync     : isAsync,
                asyncHandler: responder
            });
        } catch (e) {
            onLogoutError(e);
        }

        if (isAsync) {
            return result;
        } else {
            logoutUser();
        }
    },

    getCurrentUser: utils.promisified('_getCurrentUser'),

    getCurrentUserSync: utils.synchronized('_getCurrentUser'),

    _getCurrentUser: function(async) {
        if (currentUser) {
            var userFromResponse = this._getUserFromResponse(currentUser);

            return async ? async.success(userFromResponse) : userFromResponse;
        }

        var stayLoggedIn = Backendless.LocalCache.get("stayLoggedIn");
        var currentUserId = stayLoggedIn && Backendless.LocalCache.get("current-user-id");

        if (currentUserId) {
            return Persistence.of(User).findById(currentUserId, async);
        }

        return async ? async.success(null) : null;
    },

    update: utils.promisified('_update'),

    updateSync: utils.synchronized('_update'),

    _update: function(user, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        if (responder) {
            responder = this._wrapAsync(responder);
        }

        var result = Backendless._ajax({
            method      : 'PUT',
            url         : this.restUrl + '/' + user.objectId,
            isAsync     : isAsync,
            asyncHandler: responder,
            data        : JSON.stringify(user)
        });

        return isAsync ? result : this._parseResponse(result);
    },

    loginWithFacebook: utils.promisified('_loginWithFacebook'),

    loginWithFacebookSync: utils.synchronized('_loginWithFacebook'),

    _loginWithFacebook      : function(facebookFieldsMapping, permissions, stayLoggedIn, async) {
        return this._loginSocial('Facebook', facebookFieldsMapping, permissions, null, stayLoggedIn, async);
    },

    loginWithGooglePlus: utils.promisified('_loginWithGooglePlus'),

    loginWithGooglePlusSync: utils.synchronized('_loginWithGooglePlus'),

    _loginWithGooglePlus    : function(googlePlusFieldsMapping, permissions, container, stayLoggedIn, async) {
        return this._loginSocial('GooglePlus', googlePlusFieldsMapping, permissions, container, stayLoggedIn, async);
    },

    loginWithTwitter: utils.promisified('_loginWithTwitter'),

    loginWithTwitterSync: utils.synchronized('_loginWithTwitter'),

    _loginWithTwitter       : function(twitterFieldsMapping, stayLoggedIn, async) {
        return this._loginSocial('Twitter', twitterFieldsMapping, null, null, stayLoggedIn, async);
    },

    _socialContainer       : function(socialType, container) {
        var loadingMsg;

        if (container) {
            var client;

            container = container[0];
            loadingMsg = document.createElement('div');
            loadingMsg.innerHTML = "Loading...";
            container.appendChild(loadingMsg);
            container.style.cursor = 'wait';

            this.closeContainer = function() {
                container.style.cursor = 'default';
                container.removeChild(client);
            };

            this.removeLoading = function() {
                container.removeChild(loadingMsg);
            };

            this.doAuthorizationActivity = function(url) {
                this.removeLoading();
                client = document.createElement('iframe');
                client.frameBorder = 0;
                client.width = container.style.width;
                client.height = container.style.height;
                client.id = "SocialAuthFrame";
                client.setAttribute("src", url + "&amp;output=embed");
                container.appendChild(client);
                client.onload = function() {
                    container.style.cursor = 'default';
                };
            };
        } else {
            container = window.open('', socialType + ' authorization',
                "resizable=yes, scrollbars=yes, titlebar=yes, top=10, left=10");
            loadingMsg = container.document.getElementsByTagName('body')[0].innerHTML;
            loadingMsg = "Loading...";
            container.document.getElementsByTagName('html')[0].style.cursor = 'wait';

            this.closeContainer = function() {
                container.close();
            };

            this.removeLoading = function() {
                loadingMsg = null;
            };

            this.doAuthorizationActivity = function(url) {
                container.location.href = url;
                container.onload = function() {
                    container.document.getElementsByTagName("html")[0].style.cursor = 'default';
                };
            };
        }
    },

    _loginSocial: function(socialType, fieldsMapping, permissions, container, stayLoggedIn, async) {
        var socialContainer = new this._socialContainer(socialType, container);
        async = async && this._wrapAsync(async);

        utils.addEvent('message', window, function(e) {
            if (e.origin == Backendless.serverURL) {
                var result = JSON.parse(e.data);

                if (result.fault) {
                    async.fault(result.fault);
                } else {
                    Backendless.LocalCache.set("stayLoggedIn", !!stayLoggedIn);
                    currentUser = this.Backendless.UserService._parseResponse(result);
                    async.success(this.Backendless.UserService._getUserFromResponse(currentUser));
                }

                utils.removeEvent('message', window);
                socialContainer.closeContainer();
            }
        });

        var interimCallback = new Async(function(r) {
            socialContainer.doAuthorizationActivity(r);
        }, function(e) {
            socialContainer.closeContainer();
            async.fault(e);
        });

        var request = {};
        request.fieldsMapping = fieldsMapping || {};
        request.permissions = permissions || [];

        Backendless._ajax({
            method      : 'POST',
            url         : this.restUrl + "/social/oauth/" + socialType.toLowerCase() + "/request_url",
            isAsync     : true,
            asyncHandler: interimCallback,
            data        : JSON.stringify(request)
        });
    },

    loginWithFacebookSdk: utils.promisified('_loginWithFacebookSdk'),

    loginWithFacebookSdkSync: utils.synchronized('_loginWithFacebookSdk'),

    _loginWithFacebookSdk: function(fieldsMapping, stayLoggedIn, options, async) {
        if (!FB) {
            throw new Error("Facebook SDK not found");
        }

        if (stayLoggedIn instanceof Async) {
            async = stayLoggedIn;
            stayLoggedIn = false;
        } else if (options instanceof Async) {
            async = options;
            options = undefined;
        }

        var me = this;
        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                me._sendSocialLoginRequest(me, response, "facebook", fieldsMapping, stayLoggedIn, async);
            } else {
                FB.login(function(response) {
                    me._sendSocialLoginRequest(me, response, "facebook", fieldsMapping, stayLoggedIn, async);
                }, options);
            }
        });
    },

    loginWithGooglePlusSdk: utils.promisified('_loginWithGooglePlusSdk'),

    loginWithGooglePlusSdkSync: utils.synchronized('_loginWithGooglePlusSdk'),

    _loginWithGooglePlusSdk: function(fieldsMapping, stayLoggedIn, async) {
        if (!gapi) {
            throw new Error("Google Plus SDK not found");
        }

        if (stayLoggedIn instanceof Async) {
            async = stayLoggedIn;
            stayLoggedIn = false;
        }

        var me = this;

        gapi.auth.authorize({
            client_id: fieldsMapping.client_id,
            scope    : "https://www.googleapis.com/auth/plus.login"
        }, function(response) {
            delete response['g-oauth-window'];
            me._sendSocialLoginRequest(me, response, "googleplus", fieldsMapping, stayLoggedIn, async);
        });
    },

    _sendSocialLoginRequest: function(context, response, socialType, fieldsMapping, stayLoggedIn, async) {
        if (fieldsMapping) {
            response["fieldsMapping"] = fieldsMapping;
        }

        var interimCallback = new Async(function(r) {
            currentUser = context._parseResponse(r);
            Backendless.LocalCache.set("stayLoggedIn", !!stayLoggedIn);
            async.success(context._getUserFromResponse(currentUser));
        }, function(e) {
            async.fault(e);
        });

        Backendless._ajax({
            method      : 'POST',
            url         : context.restUrl + "/social/" + socialType + "/login/" + Backendless.applicationId,
            isAsync     : true,
            asyncHandler: interimCallback,
            data        : JSON.stringify(response)
        });
    },

    isValidLogin: utils.promisified('_isValidLogin'),

    isValidLoginSync: utils.synchronized('_isValidLogin'),

    _isValidLogin: function(async) {
        var userToken = Backendless.LocalCache.get("user-token");
        var responder = utils.extractResponder(arguments);
        var isAsync = !!responder;

        if (userToken) {
            if (!isAsync) {
                try {
                    var result = Backendless._ajax({
                        method: 'GET',
                        url   : this.restUrl + '/isvalidusertoken/' + userToken
                    });
                    return !!result;
                } catch (e) {
                    return false;
                }
            }

            return Backendless._ajax({
                method: 'GET',
                url: this.restUrl + '/isvalidusertoken/' + userToken,
                isAsync: isAsync,
                asyncHandler: responder
            });
        }

        if (!isAsync) {
            return !!this.getCurrentUserSync();
        }

        this.getCurrentUser().then(function (user) {
            responder.success(!!user);
        }, function () {
            responder.success(false);
        });
    },

    resendEmailConfirmation: utils.promisified('_resendEmailConfirmation'),

    resendEmailConfirmationSync: utils.synchronized('_resendEmailConfirmation'),

    _resendEmailConfirmation: function(emailAddress, async) {
        if(!emailAddress || emailAddress instanceof Async) {
            throw "Email cannot be empty";
        }
        var responder = utils.extractResponder(arguments);
        var isAsync = !!responder;

        return Backendless._ajax({
            method      : 'POST',
            url         : this.restUrl + "/resendconfirmation/" + emailAddress,
            isAsync     : isAsync,
            asyncHandler: responder
        });
    }
};

export default UserService