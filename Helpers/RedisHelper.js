
var _ = require('lodash');
var redis = require('redis');

var StringHelper = require('./StringHelper');

exports.BuildKey = function (prefix, keyObject) {
    var key = prefix;
    _.each(keyObject, function (value, name) {
        key += ":" + StringHelper.CapFirstLetter(name);
        if (!_.isUndefined(value) && value.length > 0) {
            key += ":" + value;
        }
    });
    return key;
};

exports.ClearRedis = function (prefix, callback) {
    var client = redis.createClient();
    client.keys(prefix + "*", function (error, keys) {
        if (keys.length > 0) {
            _.each(keys, function (key) {
                client.del(key, function () {
                    if (!_.isUndefined(callback)) {
                        callback();
                    }
                    client.quit();
                });
            });
        }
        else {
            if (!_.isUndefined(callback)) {
                callback();
            }
            client.quit();
        }
    });
};

exports.CallMethodWithMultipleKeys = function (redisClient, method, keys, additionalArguments, callback) {
    redisClient[method].apply(redisClient, keys.concat(additionalArguments).concat([ callback ]));
};

exports.GetTime = function (redisClient, callback) {
    redisClient.time(function (error, results) {
        if (error !== null) {
            callback(error);
        }
        else {
            callback(void 0, Math.floor((results[0] * 1000) + (results[1] / 1000)));
        }
    });
};
