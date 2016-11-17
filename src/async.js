import utils from './utils'

function Async(successCallback, faultCallback, context) {
    if (!(faultCallback instanceof Function)) {
        context = faultCallback;
        faultCallback = utils.emptyFn();
    }

    this.success = function(data) {
        successCallback && successCallback.call(context, data);
    };
    this.fault = function(data) {
        faultCallback && faultCallback.call(context, data);
    };
}

export default Async