
var _ = require('lodash');

var OptionsHelper = require('./../Helpers/OptionsHelper');
var IdHelper = require('./../Helpers/IdHelper');

var Consumer = require('./Classes/Consumer');

exports.createConsumer = function (opts) {
    var c = new Consumer(OptionsHelper.Validate({
        id: "Consumer" + IdHelper.GetId(7),
        applicationId: "Application" + IdHelper.GetId(7)
    }, opts));

    c.needSkillSet = function (skillSet, opts, callback) {
        if (_.isUndefined(callback) && typeof opts === "function") {
            callback = opts;
            opts = void 0;
        }
        c.NeedSkillSet(skillSet, OptionsHelper.Validate({
            timeout: 60
        }, opts), function (error) {
            callback(error);
        });
    };

    c.doneWithSkillSet = function (skillSet) {
        c.DoneWithSkillSet(skillSet);
    };

    c.postJob = function (skillSet, skillName, parameters, callback) {
        var args = _.toArray(arguments);
        if (!c.HasBeenNeeded(skillSet)) {
            c.needSkillSet(skillSet, function (error) {
                if (!_.isUndefined(error)) {
                    //TODO
                    console.error(error);
                }
                else {
                    c.emit.apply(c, ([ 'postJob' ]).concat(args));
                }
            });
        }
        else {
            c.emit.apply(c, ([ 'postJob' ]).concat(args));
        }
    };

    return c;
};
