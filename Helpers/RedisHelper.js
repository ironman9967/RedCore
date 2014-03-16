
var _ = require('lodash');
var redis = require('redis');

var StringHelper = require('./StringHelper');
var OptionsHelper = require('./OptionsHelper');

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

exports.ClearRedis = function (redisClient, prefix, callback) {
    redisClient.keys(prefix + "*", function (error, keys) {
        if (keys.length > 0) {
            _.each(keys, function (key) {
                redisClient.del(key, function () {
                    if (!_.isUndefined(callback)) {
                        callback();
                    }
                });
            });
        }
        else {
            if (!_.isUndefined(callback)) {
                callback();
            }
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

//TODO: fix how errors are reported and remove the 'done' event from node-redis (index.js line ~500)
exports.GetClient = function (port, host, options, callback) {
    options = OptionsHelper.Validate({
        connect_timeout: 10000
    }, options);
    var redisClient = redis.createClient(port, host, options);
    redisClient.once('ready', function () {
        redisClient.removeAllListeners('error');
        redisClient.removeAllListeners('done');
        callback(void 0, redisClient);
    });
    var errors = [];
    redisClient.on('error', function (error) {
        errors.push(error);
    });
    redisClient.once('done', function () {
        callback(errors);
        redisClient.removeAllListeners('error');
        redisClient.removeAllListeners('ready');
    });
};
