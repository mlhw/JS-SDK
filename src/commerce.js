import Backendless from './backendless'
import utils from './utils'

function Commerce() {
    this.restUrl = Backendless.appPath + '/commerce/googleplay';
}

Commerce.prototype = {

    validatePlayPurchase: utils.promisified('_validatePlayPurchase'),

    validatePlayPurchaseSync: utils.synchronized('_validatePlayPurchase'),

    _validatePlayPurchase: function (packageName, productId, token, async) {
        if (arguments.length < 3) {
            throw new Error('Package Name, Product Id, Token must be provided and must be not an empty STRING!');
        }

        for (var i = arguments.length - 2; i >= 0; i--) {
            if (!arguments[i] || !Utils.isString(arguments[i])) {
                throw new Error('Package Name, Product Id, Token must be provided and must be not an empty STRING!');
            }
        }

        var responder = utils.extractResponder(arguments),
            isAsync = responder != null;

        if (responder) {
            responder = utils.wrapAsync(responder);
        }

        return Backendless._ajax({
            method: 'GET',
            url: this.restUrl + '/validate/' + packageName + '/inapp/' + productId + '/purchases/' + token,
            isAsync: isAsync,
            asyncHandler: responder
        });
    },

    cancelPlaySubscription: utils.promisified('_cancelPlaySubscription'),

    cancelPlaySubscriptionSync: utils.synchronized('_cancelPlaySubscription'),

    _cancelPlaySubscription: function (packageName, subscriptionId, token, Async) {
        if (arguments.length < 3) {
            throw new Error('Package Name, Subscription Id, Token must be provided and must be not an empty STRING!');
        }

        for (var i = arguments.length - 2; i >= 0; i--) {
            if (!arguments[i] || !Utils.isString(arguments[i])) {
                throw new Error('Package Name, Subscription Id, Token must be provided and must be not an empty STRING!');
            }
        }

        var responder = utils.extractResponder(arguments),
            isAsync = responder != null;

        if (responder) {
            responder = utils.wrapAsync(responder);
        }

        return Backendless._ajax({
            method: 'POST',
            url: this.restUrl + '/' + packageName + '/subscription/' + subscriptionId + '/purchases/' + token + '/cancel',
            isAsync: isAsync,
            asyncHandler: responder
        });
    },

    getPlaySubscriptionStatus: utils.promisified('_getPlaySubscriptionStatus'),

    getPlaySubscriptionStatusSync: utils.synchronized('_getPlaySubscriptionStatus'),

    _getPlaySubscriptionStatus: function (packageName, subscriptionId, token, Async) {
        if (arguments.length < 3) {
            throw new Error('Package Name, Subscription Id, Token must be provided and must be not an empty STRING!');
        }

        for (var i = arguments.length - 2; i >= 0; i--) {
            if (!arguments[i] || !Utils.isString(arguments[i])) {
                throw new Error('Package Name, Subscription Id, Token must be provided and must be not an empty STRING!');
            }
        }

        var responder = utils.extractResponder(arguments),
            isAsync = responder != null;

        if (responder) {
            responder = utils.wrapAsync(responder);
        }

        return Backendless._ajax({
            method: 'GET',
            url: this.restUrl + '/' + packageName + '/subscription/' + subscriptionId + '/purchases/' + token,
            isAsync: isAsync,
            asyncHandler: responder
        });
    }
};

export default Commerce