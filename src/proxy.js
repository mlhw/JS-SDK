function Proxy() {
}

Proxy.prototype = {
    on       : function(eventName, handler) {
        if (!eventName) {
            throw new Error('Event name not specified');
        }

        if (!handler) {
            throw new Error('Handler not specified');
        }

        this.eventHandlers[eventName] = this.eventHandlers[eventName] || [];
        this.eventHandlers[eventName].push(handler);
    },
    fireEvent: function(eventName, data) {
        var handlers = this.eventHandlers[eventName] || [], len, i;
        for (i = 0, len = handlers.length; i < len; ++i) {
            handlers[i](data);
        }
    }
};

export default Proxy