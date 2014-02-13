
var _ = require('lodash');

var application = 'AwesomeApp';
var knownSkillSet = 'awesomeSkills';

var redcore = require('./redcore');

var worker = redcore.worker.createWorker({
    applicationId: application
});

worker.goToWork(function (callback) {
    console.log('going to work');
    callback();
});

worker.skill(knownSkillSet, 'awesomeMethod1', function (awesomeArgs, callback) {
    //echo args cause they're so awesome
    callback(awesomeArgs);
});

worker.skill(knownSkillSet, 'awesomeMethod2', function (awesomeArgs, callback) {
    awesomeArgs.justNormalAwesome = true;
    callback(awesomeArgs);
});

worker.takeBreak(function (callback) {
    console.log("taking a break");
    callback();
});

worker.breaksOver(function (callback) {
    console.log("break's over, back to work");
    callback();
});

worker.offWork(function (callback) {
    console.log("off from work");
    callback();
});

exports.worker = worker;
