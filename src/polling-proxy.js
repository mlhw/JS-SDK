import Backendless from './backendless'
import Async from './async'
import Proxy from './proxy'
import utils from './utils'

function PollingProxy(url) {
    this.eventHandlers = {};
    this.restUrl = url;
    this.timer = 0;
    this.timeout = 0;
    this.interval = 1000;
    this.xhr = null;
    this.needReconnect = true;
    this.responder = new Async(this.onMessage, this.onError, this);
    this.poll();
}

PollingProxy.prototype = new Proxy();

utils.deepExtend(PollingProxy.prototype, {
    onMessage: function(data) {
        clearTimeout(this.timeout);
        var self = this;

        this.timer = setTimeout(function() {
            self.poll();
        }, this.interval);

        this.fireEvent('messageReceived', data);
    },

    poll     : function() {
        var self = this;

        this.timeout = setTimeout(function() {
            self.onTimeout();
        }, 30 * 1000);

        this.xhr = Backendless._ajax({
            method      : 'GET',
            url         : this.restUrl,
            isAsync     : true,
            asyncHandler: this.responder
        });
    },

    close    : function() {
        clearTimeout(this.timer);
        clearTimeout(this.timeout);
        this.needReconnect = false;
        this.xhr && this.xhr.abort();
    },

    onTimeout: function() {
        this.xhr && this.xhr.abort();
    },

    onError  : function() {
        clearTimeout(this.timer);
        clearTimeout(this.timeout);

        if (this.needReconnect) {
            var self = this;
            this.xhr = null;

            this.timer = setTimeout(function() {
                self.poll();
            }, this.interval);
        }
    }
});

export default PollingProxy