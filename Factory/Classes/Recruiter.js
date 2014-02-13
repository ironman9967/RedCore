
var util = require('util');

var _ = require('lodash');

var Eventer = require('../../BaseClasses/Eventer');

var RedCoreHelper = require('../../Helpers/RedCoreHelper');

function Recruiter(redisClient, workers) {
	if ((this instanceof Recruiter) === false) {
		return new Recruiter(redisClient, workers);
	}
	Eventer.call(this);
	this._eventer = Eventer.prototype;

    this._redisClient = redisClient;
    this._workers = workers;

	this._setupEvents();
}
util.inherits(Recruiter, Eventer);

Recruiter.prototype._setupEvents = function () {
	this._eventer._setupEvents.call(this);
    var instance = this;
    this.on('recruit', function () {
        instance._recruit.apply(instance, arguments);
    });
};

Recruiter.prototype._hireWorkers = function (callback) {
    var instance = this;
    var availableSkillSets = {};
    _.each(this._workers, function (worker) {
        _.each(worker._knownSkillSets, function (skillSet) {
            if (_.isUndefined(availableSkillSets[skillSet.skillSet])) {
                availableSkillSets[skillSet.skillSet] = [];
            }
            availableSkillSets[skillSet.skillSet].push(worker);
            console.log("Worker loaded for skill set: " + skillSet.skillSet);
        });
    });
    var keys = [];
    _.each(_.uniq(_.pluck(instance._workers, '_applicationId')), function (applicationId) {
        keys.push(RedCoreHelper.BuildRedCoreKey({
            application: applicationId,
            neededSkillSets: ""
        }));
        console.log(applicationId + " workers available");
    });
    console.log("Looking for needed skill sets in " + keys.length + " application(s)");
    if (keys.length > 0) {
        RedCoreHelper.CallMethodWithMultipleKeys(this._redisClient, 'sunion', keys, [],
            function (error, neededSkillSets) {
                if (error !== null) {
                    callback(error);
                }
                else {
                    var hiredWorkers = {};
                    _.each(neededSkillSets, function (neededSkillSetJson) {
                        var neededSkillSet = JSON.parse(neededSkillSetJson).skillSet;
                        var potentialWorkers = availableSkillSets[neededSkillSet];
                        console.log("Found "
                            + (_.isUndefined(potentialWorkers) ? 0 : potentialWorkers.length)
                            + " worker(s) for skill set: " + neededSkillSet);
                        if (!_.isUndefined(potentialWorkers) && potentialWorkers.length > 0) {
                            hiredWorkers[neededSkillSet] = potentialWorkers;
                            console.log("Hired worker(s) for skill set: " + neededSkillSet);
                        }
                    });
                    callback(hiredWorkers);
                }
            });
    }
    else {
        callback({});
    }
};
Recruiter.prototype._recruit = function (callback) {
    this._hireWorkers(callback);
};

Recruiter.prototype._dispose = function () {
	this._eventer._dispose.call(this);
};

module.exports = Recruiter;
