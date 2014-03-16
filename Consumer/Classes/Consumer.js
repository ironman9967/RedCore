
var util = require('util');

var _ = require('lodash');

var Eventer = require('../../BaseClasses/Eventer');

var IdHelper = require('../../Helpers/IdHelper');
var RedCoreHelper = require('../../Helpers/RedCoreHelper');

function Consumer(options, callback) {
    if ((this instanceof Consumer) === false) {
        return new Consumer(options, callback);
    }
    Eventer.call(this);
    this._eventer = Eventer.prototype;

    this._id = options.id;
    this._applicationId = options.applicationId;
    this._redisPort = options.redisPort;
    this._redisHost = options.redisHost;
    this._redisConnectionTimeoutInSeconds = options.redisConnectionTimeoutInSeconds;
    this._neededSkillSets = {};
    this._pendingJobs = {};

    this._initClients(callback);
    this._setupEvents();
}
util.inherits(Consumer, Eventer);

Consumer.prototype._initClients = function (callback) {
    var instance = this;
    RedCoreHelper.GetClient(this._redisPort, this._redisHost, {
        connect_timeout: this._redisConnectionTimeoutInSeconds * 1000
    }, function (error, redisClient) {
        if (!_.isUndefined(error)) {
            callback(error);
        }
        else {
            instance._jobClient = redisClient;
            RedCoreHelper.GetClient(instance._redisPort, instance._redisHost, {
                connect_timeout: instance._redisConnectionTimeoutInSeconds * 1000
            }, function (error, redisClient) {
                if (!_.isUndefined(error)) {
                    callback(error);
                }
                else {
                    instance._subscriberClient = redisClient;
                    instance.emit('ready');
                }
            });
        }
    });
};

Consumer.prototype._setupEvents = function () {
    this._eventer._setupEvents.call(this);
    var instance = this;
    this.on('postJob', function () {
        instance._postJob.apply(instance, arguments);
    });
    this.once('ready', function () {
        instance._subscriberClient.on('message', function (channel, productJSON) {
            instance._finishedProduct.apply(instance, arguments);
        });
    });
};

Consumer.prototype.NeedSkillSet = function (skillSet, opts, callback) {
    this._neededSkillSets[skillSet] = opts;
    this._jobClient.sadd(RedCoreHelper.BuildRedCoreKey({
        application: this._applicationId,
        neededSkillSets: ""
    }), JSON.stringify({
        consumer: this._id,
        skillSet: skillSet
    }), function (saddError) {
        if (saddError !== null) {
            callback(saddError);
        }
        else {
            callback();
        }
    });
};
Consumer.prototype.HasBeenNeeded = function (skillSet) {
    return _.indexOf(_.keys(this._neededSkillSets), skillSet) >= 0;
};
Consumer.prototype.DoneWithSkillSet = function (skillSet, callback) {
    this._jobClient.srem(RedCoreHelper.BuildRedCoreKey({
        application: this._applicationId,
        neededSkillSets: ""
    }), JSON.stringify({
        consumer: this._id,
        skillSet: skillSet
    }), function (sremError) {
        if (sremError !== null) {
            callback(sremError);
        }
        else {
            callback();
        }
    });
};

Consumer.prototype._postJob = function (skillSet, skillName, parameters, callback) {
    var instance = this;
    var jobId = "Job" + IdHelper.GetId(7);
    RedCoreHelper.GetTime(this._jobClient, function (error, time) {
        var job = JSON.stringify({
            consumer: instance._id,
            jobId: jobId,
            skillName: skillName,
            parameters: parameters,
            created: time
        });
        var jobListKey = RedCoreHelper.BuildRedCoreKey({
            application: instance._applicationId,
            skillSet: skillSet,
            jobs: ""
        });
        instance._pushJob(job, jobListKey, function (error) {
            var channel = RedCoreHelper.BuildRedCoreKey({
                application: instance._applicationId,
                consumer: instance._id,
                needSkillSet: skillSet,
                skillName: skillName,
                jobId: jobId,
                product: ""
            });
            instance._pendingJobs[jobId] = {
                timeout: setTimeout(function () {
                    instance._productTimeout(channel, function (error) {
                        instance._cancelJob(jobListKey, job, function (error) {
                            //TODO
                            callback(error);
                        });
                    });
                }, instance._neededSkillSets[skillSet].timeout * 1000),
                callback: callback
            };
            instance._subscribeToProductChannel(channel, function (error) {
                if (!_.isUndefined(error)) {
                    //TODO
                    console.error(error);
                }
            });
        });
    });
};
Consumer.prototype._finishedProduct = function (channel, productJSON) {
    var product = JSON.parse(productJSON);
    var jobId = RedCoreHelper.GetRedCoreKeyElement(channel, "JobId");
    var jobInfo = this._pendingJobs[jobId];
    clearTimeout(jobInfo.timeout);
    jobInfo.callback(product[0], product[1], product[2]);
};

Consumer.prototype._pushJob = function (job, jobListKey, callback) {
    this._jobClient.lpush(jobListKey, job, function (lpushError) {
        if (lpushError !== null) {
            callback(lpushError);
        }
        else {
            callback();
        }
    });
};

Consumer.prototype._subscribeToProductChannel = function (channel, callback) {
    this._subscriberClient.subscribe(channel, function (error) {
        if (error !== null) {
            callback(error);
        }
        else {
            callback();
        }
    });
};

Consumer.prototype._productTimeout = function (channel, callback) {
    this._subscriberClient.unsubscribe(channel, function (error) {
        if (error !== null) {
            callback(error);
        }
        else {
            callback();
        }
    });
};

Consumer.prototype._cancelJob = function (jobListKey, job, callback) {
    this._jobClient.lrem(jobListKey, 0, job, function (error, removed) {
        if (error !== null) {
            callback(error);
        }
        else {
            callback(new Error("Timed out: " + removed));
        }
    });
};

Consumer.prototype._dispose = function () {
    this._jobClient.quit();
    this._subscriberClient.quit();
    this._eventer._dispose.call(this);
};

module.exports = Consumer;
