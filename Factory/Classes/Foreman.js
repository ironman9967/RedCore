
var util = require('util');

var _ = require('lodash');
var redis = require('redis');

var Eventer = require('../../BaseClasses/Eventer');

var OptionsHelper = require('../../Helpers/OptionsHelper');
var RedCoreHelper = require('../../Helpers/RedCoreHelper');

var Recruiter = require('./Recruiter');

function Foreman(args) {
	if ((this instanceof Foreman) === false) {
		return new Foreman(args);
	}
	Eventer.call(this);
	this._eventer = Eventer.prototype;

    this._options = {};
    this._workerFiles = [];
    this._workers = [];

	this._setupEvents();
    this._parseArgs(args);

    this._options = OptionsHelper.Validate({
        WorkerWaitForJobTimeoutInSeconds: 10
    }, this._options);

    this._recruiter = void 0;

    this._workTimeout = void  0;
}
util.inherits(Foreman, Eventer);

Foreman.prototype._setupEvents = function () {
	this._eventer._setupEvents.call(this);
    var instance = this;
    this.on('startWork', function () {
        instance._startWork.apply(instance, arguments);
    });
};

Foreman.prototype._parseArgs = function (args) {
    while (args.length > 0) {
        var arg = args.pop();
        if (arg.indexOf('.js') > 0) {
            this._workerFiles.push(arg);
        }
        //TODO: ARE THERE ANY?
//        else if (arg.indexOf('-') === 0) {
//            var flag = arg.substring(1);
//        }
        else if (arg.indexOf('=') > 0) {
            this._options[arg.substring(0, arg.indexOf('='))] = arg.substring(arg.indexOf('=') + 1);
        }
    }
};

Foreman.prototype._startWork = function () {
    this._requireWorkerFiles();
    this._initRecruiter();
    this._work();
};

Foreman.prototype._requireWorkerFiles = function () {
    var instance = this;
    _.each(this._workerFiles, function (workerFile) {
        instance._workers.push(require('../../' + workerFile).worker);
        console.log('Loaded ' + workerFile);
    });
};

Foreman.prototype._initRecruiter = function () {
    this._recruiter = new Recruiter(redis.createClient(), this._workers);
};

Foreman.prototype._work = function () {
    var instance = this;
    this._recruiter.emit('recruit', function (hiredWorkers) {
        var keys = [];
        console.log("Working " + (_.isUndefined(hiredWorkers) ? 0
            : _.keys(hiredWorkers).length) + " workers");
        _.each(hiredWorkers, function (workers, skillSet) {
            _.each(_.uniq(_.pluck(workers, '_applicationId')), function (applicationId) {
                keys.push(RedCoreHelper.BuildRedCoreKey({
                    application: applicationId,
                    skillSet: skillSet,
                    jobs: ""
                }));
                console.log("Going to look for a job using skill set " + skillSet + " for the "
                    + applicationId + " application");
            });
        });
        if (keys.length > 0) {
            var redisClient = redis.createClient();
            console.log("Popping job for one of the hired workers");
            RedCoreHelper.CallMethodWithMultipleKeys(redisClient, 'brpop', keys,
                [ instance._options.WorkerWaitForJobTimeoutInSeconds ], function (brpopError, jobInfo) {
                    if (brpopError !== null) {
                        redisClient.quit();
                        //TODO
                        console.error(brpopError);
                    }
                    else if (jobInfo === null) {
                        console.log("Pop job timed out, trying again");
                        redisClient.quit();
                        instance._work();
                    }
                    else {
                        var job = JSON.parse(jobInfo[1]);
                        RedCoreHelper.GetTime(redisClient, function (error, time) {
                            if (!_.isUndefined(error)) {
                                //TODO
                                console.error(error);
                            }
                            else {
                                job.skillSet = RedCoreHelper.GetRedCoreKeyElement(jobInfo[0], 'SkillSet');
                                var worker = _.sample(hiredWorkers[job.skillSet], 1)[0];
                                console.log("Job " + job.skillName + " found for worker " + worker._id
                                    + " using " + job.skillSet);
                                var workerEvent = 'goToWork';
                                if (worker._atWork) {
                                    workerEvent = 'breaksOver';
                                }
                                worker.emit(workerEvent, job, function (product) {
                                    if (!_.isUndefined(error)) {
                                        redisClient.quit();
                                        //TODO
                                        console.error(error);
                                    }
                                    else {
                                        console.log("Pushing " + job.skillName + " product to redis");
                                        var meta = {
                                            application: worker._applicationId,
                                            needSkillSet: job.skillSet,
                                            skillName: job.skillName,
                                            jobId: job.jobId,
                                            workedBy: worker._id,
                                            msToComplete: time - job.created
                                        };
                                        redisClient.publish(RedCoreHelper.BuildRedCoreKey({
                                            application: worker._applicationId,
                                            consumer: job.consumer,
                                            needSkillSet: job.skillSet,
                                            skillName: job.skillName,
                                            jobId: job.jobId,
                                            product: ""
                                        }), JSON.stringify([ product, meta ]), function (error) {
                                            redisClient.quit();
                                            if (error !== null) {
                                                //TODO
                                                console.error(error);
                                            }
                                            else {
                                                console.log("Worker finished queueing job " +
                                                    "product in redis, taking a break");
                                                worker.emit('takeBreak', function () {
                                                    instance._work();
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
        }
        else {
            setTimeout(function () {
                instance._work();
            }, instance._options.WorkerWaitForJobTimeoutInSeconds * 1000);
            console.log("Didn't find any needed skill sets for hired workers, trying again in "
                + instance._options.WorkerWaitForJobTimeoutInSeconds + " second(s)");
        }
    });
};

Foreman.prototype._dispose = function () {
    clearTimeout(this._workTimeout);
	this._eventer._dispose.call(this);
};

module.exports = Foreman;
