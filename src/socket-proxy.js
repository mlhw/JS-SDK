import Proxy from './proxy'

function SocketProxy(url) {
    var self = this;
    this.reconnectWithPolling = true;

    try {
        var socket = this.socket = new WebSocket(url);
        socket.onopen = function() {
            return self.sockOpen();
        };
        socket.onerror = function(error) {
            return self.sockError(error);
        };
        socket.onclose = function() {
            self.onSocketClose();
        };

        socket.onmessage = function(event) {
            return self.onMessage(event);
        };
    } catch (e) {
        setTimeout(function() {
            self.onSocketClose();
        }, 100);
    }
}

SocketProxy.prototype = new Proxy();

export default SocketProxy