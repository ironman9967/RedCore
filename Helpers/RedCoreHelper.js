
var _ = require('lodash');

var RedisHelper = require('./RedisHelper');

var redCoreKeyPrefix = 'RedCoreKeyPrefix';

exports.BuildRedCoreKey = function (keyObject) {
    return RedisHelper.BuildKey(redCoreKeyPrefix, keyObject);
};

exports.GetRedCoreKeyElement = function (key, keyElement) {
    var eleValueStart = key.indexOf(':' + keyElement + ':') +  keyElement.length + 2;
    var eleValueStop = key.substring(eleValueStart).indexOf(':') + eleValueStart;
    return key.substring(eleValueStart, eleValueStop);
};

exports.ClearRedCoreData = function (keyObject) {
    return RedisHelper.ClearRedis(redCoreKeyPrefix, keyObject);
};

exports.GetClient = function (port, host, options, callback) {
    if (OptionalParam(port, callback)) {
        callback = port;
        port = undefined;
    }
    if (OptionalParam(host, callback)) {
        callback = host;
        host = undefined;
    }
    if (OptionalParam(options, callback)) {
        callback = options;
        options = undefined;
    }
    return RedisHelper.GetClient(port, host, options, callback);
};
function OptionalParam(value, callback) {
    return !_.isUndefined(value) && typeof value === "function" && _.isUndefined(callback);
}

exports.CallMethodWithMultipleKeys = RedisHelper.CallMethodWithMultipleKeys;
exports.GetTime = RedisHelper.GetTime;

exports.RedCoreKeyPrefix = redCoreKeyPrefix;
