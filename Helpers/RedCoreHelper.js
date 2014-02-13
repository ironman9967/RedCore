
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

exports.CallMethodWithMultipleKeys = RedisHelper.CallMethodWithMultipleKeys;
exports.GetTime = RedisHelper.GetTime;

exports.RedCoreKeyPrefix = redCoreKeyPrefix;
