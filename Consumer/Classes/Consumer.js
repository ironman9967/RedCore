
var util = require('util');

var _ = require('lodash');
var redis = require('redis');

var Eventer = require('../../BaseClasses/Eventer');

var IdHelper = require('../../Helpers/IdHelper');
var RedCoreHelper = require('../../Helpers/RedCoreHelper');

function Consumer(options) {
    if ((this instanceof Consumer) === false) {
        return new Consumer(options);
    }
    Eventer.call(this);
    this._eventer = Eventer.prototype;

    this._id = options.id;
    this._applicationId = options.applicationId;
    this._neededSkillSets = {};

    this._jobClient = redis.createClient();
    this._subscriberClient = redis.createClient();

    this._setupEvents();
}
util.inherits(Consumer, Eventer);

Consumer.prototype._setupEvents = function () {
    this._eventer._setupEvents.call(this);
    var instance = this;
    this.on('postJob', function () {
        instance._postJob.apply(instance, arguments);
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
            callback(void 0);
        }
    });
};
Consumer.prototype.HasBeenNeeded = function (skillSet) {
    return _.indexOf(_.keys(this._neededSkillSets), skillSet) >= 0;
};
Consumer.prototype.DoneWithSkillSet = function (type) {
    //TODO
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
        instance._jobClient.lpush(jobListKey, job, function (lpushError) {
            if (lpushError !== null) {
                callback(lpushError);
            }
            else {
                var timeout = void 0;
                instance._subscriberClient.once('message', function (channel, productJSON) {
                    var product = JSON.parse(productJSON);
                    clearTimeout(timeout);
                    callback(void 0, product[0], product[1]);
                });
                var channel = RedCoreHelper.BuildRedCoreKey({
                    application: instance._applicationId,
                    consumer: instance._id,
                    needSkillSet: skillSet,
                    skillName: skillName,
                    jobId: jobId,
                    product: ""
                });
                instance._subscriberClient.subscribe(channel, function (error) {
                    if (error !== null) {
                        callback(error);
                    }
                    else {
                        timeout = setTimeout(function () {
                            instance._subscriberClient.unsubscribe(channel, function (error) {
                                if (error !== null) {
                                    //TODO
                                    console.error(error);
                                }
                                else {
                                    instance._jobClient.lrem(jobListKey, 0, job,
                                        function (error, removed) {
                                            if (error !== null) {
                                                //TODO
                                                console.error(error);
                                            }
                                            else {
                                                //TODO
                                                callback("Timed out: " + removed);
                                            }
                                        });
                                }
                            });
                        }, instance._neededSkillSets[skillSet].timeout * 1000);
                    }
                });
            }
        });
    });
};

Consumer.prototype._dispose = function () {
    this._jobClient.quit();
    this._subscriberClient.quit();
    this._eventer._dispose.call(this);
};

module.exports = Consumer;
