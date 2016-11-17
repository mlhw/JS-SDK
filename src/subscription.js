import Backendless from './backendless'
import Async from './async'
import SocketProxy from './socket-proxy'
import PollingProxy from './polling-proxy'
import utils from './utils'

function Subscription(config) {
    this.channelName = config.channelName;
    this.options = config.options;
    this.channelProperties = config.channelProperties;
    this.subscriptionId = null;
    this.restUrl = config.restUrl + '/' + config.channelName;
    this.responder = config.responder || utils.emptyFn();
    this._subscribe(config.onSubscribe);
}

Subscription.prototype = {
    _subscribe        : function(async) {
        var responder = utils.extractResponder(arguments);
        var isAsync = !!responder;
        var self = this;

        var _async = new Async(function(data) {
            self.subscriptionId = data.subscriptionId;
            self._startSubscription();
        }, function(e) {
            responder.fault(e);
        });

        var subscription = Backendless._ajax({
            method      : 'POST',
            url         : this.restUrl + '/subscribe',
            isAsync     : isAsync,
            data        : JSON.stringify(this.options),
            asyncHandler: _async
        });

        if (!isAsync) {
            this.subscriptionId = subscription.subscriptionId;
            this._startSubscription();
        }
    },

    _startSubscription: function() {
        var self = this;

        if (WebSocket) {
            var url = this.channelProperties['websocket'] + '/' + this.subscriptionId;
            this.proxy = new SocketProxy(url);

            this.proxy.on('socketClose', function() {
                self._switchToPolling();
            });

            this.proxy.on('messageReceived', function() {
                self.responder();
            });
        } else {
            this._switchToPolling();
        }

        this._startSubscription = utils.emptyFn();
    },

    cancelSubscription: function() {
        this.proxy && this.proxy.close();
        this._startSubscription = utils.emptyFn();
    },

    _switchToPolling  : function() {
        var url = this.restUrl + '/' + this.subscriptionId;
        this.proxy = new PollingProxy(url);
        var self = this;

        this.proxy.on('messageReceived', function(data) {
            if (data.messages.length) {
                self.responder(data);
            }
        });
    }
};

export default Subscription