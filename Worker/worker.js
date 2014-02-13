
var _ = require('lodash');

var OptionsHelper = require('./../Helpers/OptionsHelper');
var IdHelper = require('./../Helpers/IdHelper');

var Worker = require('./Classes/Worker');

exports.createWorker = function (opts) {
    var w = new Worker.Worker(OptionsHelper.Validate({
        id: "Worker" + IdHelper.GetId(7),
        applicationId: "Application" + IdHelper.GetId(7)
    }, opts));

    w.skill = function (skillSet, skillName, callback) {
        w.emit.apply(w, ([ 'skill' ]).concat(_.toArray(arguments)));
    };

    w.goToWork = function (callback) {
        w._goToWorkUser = callback;
    };

    w.takeBreak = function (callback) {
        w._takeBreakUser = callback;
    };

    w.breaksOver = function (callback) {
        w._goToWorkUser = callback;
    };

    w.offWork = function (callback) {
        w._breaksOverUser = callback;
    };

    return w;
};


