
var util = require('util');

var _ = require('lodash');

var Eventer = require('../../BaseClasses/Eventer');

function Worker(options) {
	if ((this instanceof Worker) === false) {
		return new Worker(options);
	}
	Eventer.call(this);
	this._eventer = Eventer.prototype;

    this._id = options.id;
    this._applicationId = options.applicationId;
    this._knownSkillSets = [];
    this._atWork = false;

	this._setupEvents();
}
util.inherits(Worker, Eventer);

Worker.prototype._setupEvents = function () {
	this._eventer._setupEvents.call(this);
    var instance = this;
    this.on('goToWork', function () {
        instance._goToWork.apply(instance, arguments);
    });
    this.on('takeBreak', function () {
        instance._takeBreak.apply(instance, arguments);
    });
    this.on('breaksOver', function () {
        instance._breaksOver.apply(instance, arguments);
    });
    this.on('offWork', function () {
        instance._offWork.apply(instance, arguments);
    });
    this.on('skill', function () {
        instance._skill.apply(instance, arguments);
    });
};

Worker.prototype._knowsSkillSet = function (skillSet) {
    this._knownSkillSets.push({ skillSet: skillSet, skills: [] });
};

Worker.prototype._skill = function (skillSet, skillName, callback) {
    var alreadyKnown = _.find(this._knownSkillSets, function (knownSkillSet) {
        return knownSkillSet.skillSet === skillSet
    });
    if (_.isUndefined(alreadyKnown)) {
        this._knowsSkillSet(skillSet);
        alreadyKnown = _.find(this._knownSkillSets, function (knownSkillSet) {
            return knownSkillSet.skillSet === skillSet
        });
    }
    alreadyKnown.skills.push({
        skillName: skillName,
        callback: callback
    });
};

Worker.prototype._goToWork = function (job, callback) {
    var instance = this;
    this._goToWorkUser(function () {
        instance._atWork = true;
        instance._doJob(job, callback);
    });
};

Worker.prototype._takeBreak = function (callback) {
    this._takeBreakUser(function () {
        callback();
    });
};

Worker.prototype._breaksOver = function (job, callback) {
    var instance = this;
    this._breaksOverUser(function () {
        instance._doJob(job, callback);
    });
};

Worker.prototype._offWork = function (callback) {
    var instance = this;
    this._offWorkUser(function () {
        instance._atWork = false;
        callback();
    });
};

Worker.prototype._doJob = function (job, callback) {
    var knownSkillSet = _.find(this._knownSkillSets, function (knownSkillSet) {
        return knownSkillSet.skillSet === job.skillSet
            && _.contains(_.pluck(knownSkillSet.skills, 'skillName'), job.skillName)
    });
    if (!_.isUndefined(knownSkillSet)) {
        var knownSkill = _.find(knownSkillSet.skills, function (knownSkill) {
            return knownSkill.skillName === job.skillName;
        });
        if (!_.isUndefined(knownSkill)) {
            knownSkill.callback(job.parameters, callback);
        }
    }
};

Worker.prototype._dispose = function () {
	this._eventer._dispose.call(this);
};

exports.Worker = Worker;
