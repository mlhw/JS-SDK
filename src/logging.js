Backendless.Logging = {
    restUrl              : root.url,
    loggers              : {},
    logInfo              : [],
    messagesCount        : 0,
    numOfMessages        : 10,
    timeFrequency        : 1,
    getLogger            : function(loggerName) {
        if (!Utils.isString(loggerName)) {
            throw new Error("Invalid 'loggerName' value. LoggerName must be a string value");
        }

        if (!this.loggers[loggerName]) {
            this.loggers[loggerName] = new Logging(loggerName);
        }

        return this.loggers[loggerName];
    },

    flush: function() {
        var async = extractResponder(arguments);

        if (this.logInfo.length) {
            this.flushInterval && clearTimeout(this.flushInterval);

            var listeners;
            var cb = function(method) {
                return function() {
                    for (var i = 0; i < listeners.length; i++) {
                        listeners[i][method].apply(null, arguments);
                    }

                    if (listeners === lastFlushListeners) {
                        lastFlushListeners = null;
                    }
                }
            };

            if (async) {
                listeners = lastFlushListeners = lastFlushListeners ? lastFlushListeners.splice(0) : [];
                listeners.push(async);
            }

            Backendless._ajax({
                method      : 'PUT',
                isAsync     : !!async,
                asyncHandler: async && new Async(cb('success'), cb('fault')),
                url         : Backendless.appPath + '/log',
                data        : JSON.stringify(this.logInfo)
            });

            this.logInfo = [];
            this.messagesCount = 0;
        } else if (async) {
            if (lastFlushListeners) {
                lastFlushListeners.push(async);
            } else {
                setTimeout(async.success, 0);
            }
        }
    },

    sendRequest          : function() {
        var logging = this;

        this.flushInterval = setTimeout(function() {
            logging.flush(new Async());
        }, this.timeFrequency * 1000);
    },

    checkMessagesLen     : function() {
        if (this.messagesCount > (this.numOfMessages - 1)) {
            this.sendRequest();
        }
    },

    setLogReportingPolicy: function(numOfMessages, timeFrequency) {
        this.numOfMessages = numOfMessages;
        this.timeFrequency = timeFrequency;
        this.checkMessagesLen();
    }
};

function Logging(name) {
    this.name = name;
}

function setLogMessage(logger, logLevel, message, exception) {
    var messageObj = {};
    messageObj['message'] = message;
    messageObj['timestamp'] = Date.now();
    messageObj['exception'] = (exception) ? exception : null;
    messageObj['logger'] = logger;
    messageObj['log-level'] = logLevel;
    Backendless.Logging.logInfo.push(messageObj);
    Backendless.Logging.messagesCount++;
    Backendless.Logging.checkMessagesLen();
}

Logging.prototype = {
    debug: function(message) {
        return setLogMessage(this.name, "DEBUG", message);
    },
    info : function(message) {
        return setLogMessage(this.name, "INFO", message);
    },
    warn : function(message, exception) {
        return setLogMessage(this.name, "WARN", message, exception);
    },
    error: function(message, exception) {
        return setLogMessage(this.name, "ERROR", message, exception);
    },
    fatal: function(message, exception) {
        return setLogMessage(this.name, "FATAL", message, exception);
    },
    trace: function(message) {
        return setLogMessage(this.name, "TRACE", message);
    }
};