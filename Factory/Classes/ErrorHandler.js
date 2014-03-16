
var util = require('util');
var fs = require('fs');

var _ = require('lodash');

var Eventer = require('../../BaseClasses/Eventer');

var RedCoreHelper = require('../../Helpers/RedCoreHelper');

function ErrorHandler(pipeToConsole) {
	if ((this instanceof ErrorHandler) === false) {
		return new ErrorHandler(pipeToConsole);
	}
	Eventer.call(this);
	this._eventer = Eventer.prototype;

    this._pipeToConsole = pipeToConsole;

	this._setupEvents();
}
util.inherits(ErrorHandler, Eventer);

ErrorHandler.prototype._setupEvents = function () {
	this._eventer._setupEvents.call(this);
    var instance = this;
    this.on('handle', function () {
        instance._toRedis.apply(instance, arguments);
    });
    this.on('toFile', function () {
        instance._toFile.apply(instance, arguments);
    });
};

ErrorHandler.prototype._handle = function (error, prefix, redisClient, logFilePath) {
    if (!_.isUndefined(redisClient) && redisClient.connected) {
        this._toRedis(error, prefix, redisClient);
    }
    else if (!_.isUndefined(logFilePath)) {
        this._toFile(error, logFilePath);
    }
};

ErrorHandler.prototype._toRedis = function (error, prefix, redisClient) {
    var errorListKey = RedCoreHelper.BuildRedCoreKey({
        EventLog: prefix,
        errors: ""
    });
    var instance = this;
    RedCoreHelper.GetTime(redisClient, function (error, time) {
        if (!_.isUndefined(time)) {
            redisClient.zadd(errorListKey, time, instance._packageError(error), function (error) {
                if (!_.isUndefined(error)) {
                    instance._checkPipeToConsole(error);
                }
            });
        }
    });
};
ErrorHandler.prototype._toFile = function (error, logFilePath) {
    var writer = fs.createWriteStream(logFilePath, { flags: "a+" });
    var instance = this;
    writer.on('error', function (error) {
        instance._checkPipeToConsole(error)
    });
    writer.end(this._packageError(error), 'utf8');
};

ErrorHandler.prototype._checkPipeToConsole = function (error) {
    if (this._pipeToConsole) {
        console.error(error.stack);
    }
};
ErrorHandler.prototype._packageError = function (error) {
    return JSON.stringify({
        error: error.stack
    });
};

ErrorHandler.prototype._dispose = function () {
	this._eventer._dispose.call(this);
};

module.exports = ErrorHandler;
