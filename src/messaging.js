import Backendless from './backendless'
import utils from './utils'

var NodeDevice = {
    name    : 'NODEJS',
    platform: 'NODEJS',
    uuid    : 'someId',
    version : '1'
};

function Messaging() {
    this.restUrl = Backendless.appPath + '/messaging';
    this.channelProperties = {};
}

Messaging.prototype = {
    _getProperties  : function(channelName, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        var props = this.channelProperties[channelName];

        if (props) {
            if (isAsync) {
                async.success(props);
            }

            return props;
        }

        var result = Backendless._ajax({
            method      : 'GET',
            url         : this.restUrl + '/' + channelName + '/properties',
            isAsync     : isAsync,
            asyncHandler: responder
        });

        this.channelProperties[channelName] = result;

        return result;
    },

    subscribe: utils.promisified('_subscribe'),

    subscribeSync: utils.synchronized('_subscribe'),

    _subscribe       : function(channelName, subscriptionCallback, subscriptionOptions, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        if (isAsync) {
            var that = this;

            var callback = new Async(function(props) {
                async.success(new Subscription({
                    channelName      : channelName,
                    options          : subscriptionOptions,
                    channelProperties: props,
                    responder        : subscriptionCallback,
                    restUrl          : that.restUrl,
                    onSubscribe      : responder
                }));
            }, function(data) {
                responder.fault(data);
            });

            this._getProperties(channelName, callback);
        } else {
            var props = this._getProperties(channelName);

            return new Subscription({
                channelName      : channelName,
                options          : subscriptionOptions,
                channelProperties: props,
                responder        : subscriptionCallback,
                restUrl          : this.restUrl
            });
        }
    },

    publish: utils.promisified('_publish'),

    publishSync: utils.synchronized('_publish'),

    _publish         : function(channelName, message, publishOptions, deliveryTarget, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        var data = {
            message: message
        };

        if (publishOptions) {
            if (!(publishOptions instanceof PublishOptions)) {
                throw "Use PublishOption as publishOptions argument";
            }

            utils.deepExtend(data, publishOptions);
        }

        if (deliveryTarget) {
            if (!(deliveryTarget instanceof DeliveryOptions)) {
                throw "Use DeliveryOptions as deliveryTarget argument";
            }

            utils.deepExtend(data, deliveryTarget);
        }

        return Backendless._ajax({
            method      : 'POST',
            url         : this.restUrl + '/' + channelName,
            isAsync     : isAsync,
            asyncHandler: responder,
            data        : JSON.stringify(data)
        });
    },

    sendEmail: utils.promisified('_sendEmail'),

    sendEmailSync: utils.synchronized('_sendEmail'),

    _sendEmail       : function(subject, bodyParts, recipients, attachments, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;
        var data = {};

        if (subject && !Utils.isEmpty(subject) && Utils.isString(subject)) {
            data.subject = subject;
        } else {
            throw "Subject is required parameter and must be a nonempty string";
        }

        if ((bodyParts instanceof Bodyparts) && !Utils.isEmpty(bodyParts)) {
            data.bodyparts = bodyParts;
        } else {
            throw "Use Bodyparts as bodyParts argument, must contain at least one property";
        }

        if (recipients && Utils.isArray(recipients) && !Utils.isEmpty(recipients)) {
            data.to = recipients;
        } else {
            throw "Recipients is required parameter, must be a nonempty array";
        }

        if (attachments) {
            if (Utils.isArray(attachments)) {
                if (!Utils.isEmpty(attachments)) {
                    data.attachment = attachments;
                }
            } else {
                throw "Attachments must be an array of file IDs from File Service";
            }
        }

        return Backendless._ajax({
            method      : 'POST',
            url         : this.restUrl + '/email',
            isAsync     : isAsync,
            asyncHandler: responder,
            data        : JSON.stringify(data)
        });
    },

    cancel: utils.promisified('_cancel'),

    cancelSync: utils.synchronized('_cancel'),

    _cancel          : function(messageId, async) {
        var isAsync = async != null;

        return Backendless._ajax({
            method      : 'DELETE',
            url         : this.restUrl + '/' + messageId,
            isAsync     : isAsync,
            asyncHandler: new Async(utils.emptyFn())
        });
    },

    registerDevice: utils.promisified('_registerDevice'),

    registerDeviceSync: utils.synchronized('_registerDevice'),

    _registerDevice  : function(channels, expiration, async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;
        var device = Backendless.isBrowser ? window.device : NodeDevice;

        var data = {
            deviceToken: null, //This value will set in callback
            deviceId   : device.uuid,
            os         : device.platform,
            osVersion  : device.version
        };

        if (Utils.isArray(channels)) {
            data.channels = channels;
        }

        for (var i = 0, len = arguments.length; i < len; ++i) {
            var val = arguments[i];
            if (Utils.isNumber(val) || val instanceof Date) {
                data.expiration = (val instanceof Date) ? val.getTime() / 1000 : val;
            }
        }

        var url = this.restUrl + '/registrations';

        var success = function(deviceToken) {
            data.deviceToken = deviceToken;

            Backendless._ajax({
                method      : 'POST',
                url         : url,
                data        : JSON.stringify(data),
                isAsync     : isAsync,
                asyncHandler: responder
            });
        };

        var fail = function(status) {
            console.warn(JSON.stringify(['failed to register ', status]));
        };

        var config = {
            projectid: "http://backendless.com",
            appid    : Backendless.applicationId
        };

        cordova.exec(success, fail, "PushNotification", "registerDevice", [config]);
    },

    getRegistrations: utils.promisified('_getRegistrations'),

    getRegistrationsSync: utils.synchronized('_getRegistrations'),

    _getRegistrations: function(async) {
        var deviceId = Backendless.isBrowser ? window.device.uuid : NodeDevice.uuid;
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        return Backendless._ajax({
            method      : 'GET',
            url         : this.restUrl + '/registrations/' + deviceId,
            isAsync     : isAsync,
            asyncHandler: responder
        });
    },

    unregisterDevice: utils.promisified('_unregisterDevice'),

    unregisterDeviceSync: utils.synchronized('_unregisterDevice'),

    _unregisterDevice: function(async) {
        var deviceId = Backendless.isBrowser ? window.device.uuid : NodeDevice.uuid;
        var responder = utils.extractResponder(arguments);
        var isAsync = responder != null;

        var result = Backendless._ajax({
            method      : 'DELETE',
            url         : this.restUrl + '/registrations/' + deviceId,
            isAsync     : isAsync,
            asyncHandler: responder
        });

        try {
            cordova.exec(utils.emptyFn(), utils.emptyFn(), "PushNotification", "unregisterDevice", []);
        } catch (e) {
            console.log(e.message);
        }

        return result;
    }
};