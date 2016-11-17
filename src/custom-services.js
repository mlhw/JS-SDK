import Backendless from './backendless'
import utils from './utils'

function CustomServices() {
    this.restUrl = Backendless.appPath + '/services/';
}

CustomServices.prototype = {
    invoke: utils.promisified('_invoke'),

    invokeSync: utils.synchronized('_invoke'),

    _invoke: function(serviceName, serviceVersion, method, parameters, async) {
        var responder = utils.extractResponder(arguments),
            isAsync   = responder != null;

        return Backendless._ajax({
            method      : "POST",
            url         : this.restUrl + [serviceName, serviceVersion, method].join('/'),
            data        : JSON.stringify(parameters),
            isAsync     : isAsync,
            asyncHandler: responder
        });
    }
};

export default CustomServices