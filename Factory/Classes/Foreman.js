
var util = require('util');

var _ = require('lodash');

var Eventer = require('../../BaseClasses/Eventer');

var RedCoreHelper = require('../../Helpers/RedCoreHelper');

var ErrorHandler = require('./ErrorHandler');
var Recruiter = require('./Recruiter');

function Foreman(workerFiles, options) {
	if ((this instanceof Foreman) === false) {
		return new Foreman(workerFiles, options);
	}
	Eventer.call(this);
	this._eventer = Eventer.prototype;

    this._redisClient = void 0;

    this._options = options;
    this._workerFiles = workerFiles;
    this._workers = [];

    this._recruiter = void 0;
    this._errorHandler = void 0;

    this._workTimeout = void  0;

    this._initErrorHandler();
	this._setupEvents();
}
util.inherits(Foreman, Eventer);

Foreman.prototype._initErrorHandler = function () {
    this._errorHandler = new ErrorHandler(true);
};

Foreman.prototype._setupEvents = function () {
	this._eventer._setupEvents.call(this);
    var instance = this;
    this.on('startWork', function () {
        instance._startWork.apply(instance, arguments);
    });
};

Foreman.prototype._startWork = function () {
    this._requireWorkerFiles();
    var instance = this;
    RedCoreHelper.GetClient(this._options.redisPort, this._options.redisHost, {
        connect_timeout: this._options.redisConnectionTimeoutInSeconds * 1000
    }, function (error, redisClient) {
        if (_.isUndefined(error)) {
            instance._redisClient = redisClient;
            instance._initRecruiter();
            instance._work();
        }
        else {
            instance._errorHandler.emit('handle', error, void 0, void 0,
                instance._options.redisConnectionLogFilePath);
        }
    });
};

Foreman.prototype._requireWorkerFiles = function () {
    var instance = this;
    _.each(this._workerFiles, function (workerFile) {
        instance._workers.push(require('../../' + workerFile).worker);
        console.log('Loaded ' + workerFile);
    });
};

Foreman.prototype._initRecruiter = function () {
    this._recruiter = new Recruiter(this._redisClient, this._workers);
};

Foreman.prototype._work = function () {
    var instance = this;
    this._recruiter.emit('recruit', function (error, hiredWorkers) {
        if (!_.isUndefined(error)) {
            instance._errorHandler.emit('handle', error, "Factory", instance._redisClient,
                instance._options.redisConnectionLogFilePath)
        }
        else {
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
                console.log("Popping job for one of the hired workers");
                RedCoreHelper.CallMethodWithMultipleKeys(instance._redisClient, 'brpop', keys,
                    [ instance._options.workerWaitForJobTimeoutInSeconds ],
                    function (brpopError, jobInfo) {
                        if (brpopError !== null) {
                            instance._errorHandler.emit('handle', brpopError, "Factory",
                                instance._redisClient, instance._options.redisConnectionLogFilePath);
                        }
                        else if (jobInfo === null) {
                            console.log("Pop job timed out, trying again");
                            instance._work();
                        }
                        else {
                            var job = JSON.parse(jobInfo[1]);
                            RedCoreHelper.GetTime(instance._redisClient, function (timeError, time) {
                                if (!_.isUndefined(timeError)) {
                                    instance._errorHandler.emit('handle', timeError, "Factory",
                                        instance._redisClient,
                                        instance._options.redisConnectionLogFilePath);
                                }
                                else {
                                    job.skillSet = RedCoreHelper.GetRedCoreKeyElement(jobInfo[0],
                                        'SkillSet');
                                    var worker = _.sample(hiredWorkers[job.skillSet], 1)[0];
                                    console.log("Job " + job.skillName + " found for worker " + worker._id
                                        + " using " + job.skillSet);
                                    var workerEvent = 'goToWork';
                                    if (worker._atWork) {
                                        workerEvent = 'breaksOver';
                                    }
                                    worker.emit(workerEvent, job, function (productError, product) {
                                        var productString = "";
                                        var meta = {
                                            application: worker._applicationId,
                                            needSkillSet: job.skillSet,
                                            skillName: job.skillName,
                                            jobId: job.jobId,
                                            workedBy: worker._id,
                                            msToComplete: time - job.created
                                        };
                                        if (!_.isUndefined(productError)) {
                                            console.log("Pushing " + job.skillName + " error to redis");
                                            productString = JSON.stringify([ productError ]);
                                        }
                                        else {
                                            console.log("Pushing " + job.skillName + " product to redis");
                                            productString = JSON.stringify([ void 0, product, meta ]);
                                        }
                                        instance._redisClient.publish(RedCoreHelper.BuildRedCoreKey({
                                            application: worker._applicationId,
                                            consumer: job.consumer,
                                            needSkillSet: job.skillSet,
                                            skillName: job.skillName,
                                            jobId: job.jobId,
                                            product: ""
                                        }), productString, function (publishError) {
                                            if (publishError !== null) {
                                                instance._errorHandler.emit('handle', publishError,
                                                    worker._applicationId, instance._redisClient,
                                                    instance._options.redisConnectionLogFilePath);
                                            }
                                            else {
                                                console.log("Worker finished queueing job " +
                                                    "product in redis, taking a break");
                                                worker.emit('takeBreak', function () {
                                                    instance._work();
                                                });
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    });
            }
            else {
                setTimeout(function () {
                    instance._work();
                }, instance._options.workerWaitForJobTimeoutInSeconds * 1000);
                console.log("Didn't find any needed skill sets for hired workers, trying again in "
                    + instance._options.workerWaitForJobTimeoutInSeconds + " second(s)");
            }
        }
    });
};

Foreman.prototype._dispose = function () {
    clearTimeout(this._workTimeout);
    this._redisClient.quit();
	this._eventer._dispose.call(this);
};

module.exports = Foreman;
