import Backendless from './backendless'
import utils from './utils'

function Events() {
    this.restUrl = Backendless.appPath + '/servercode/events';
}

Events.prototype = {
    dispatch: utils.promisified('_dispatch'),

    dispatchSync: utils.synchronized('_dispatch'),

    _dispatch: function (eventName, eventArgs, Async) {
        if (!eventName || !utils.isString(eventName)) {
            throw new Error('Event Name must be provided and must be not an empty STRING!');
        }

        eventArgs = utils.isObject(eventArgs) ? eventArgs : {};

        var responder = utils.extractResponder(arguments),
            isAsync = responder != null;

        if (responder) {
            responder = utils.wrapAsync(responder);
        }

        eventArgs = eventArgs instanceof Async ? {} : eventArgs;

        return Backendless._ajax({
            method: 'POST',
            url: this.restUrl + '/' + eventName,
            data: JSON.stringify(eventArgs),
            isAsync: isAsync,
            asyncHandler: responder
        });
    }
};

export default Events