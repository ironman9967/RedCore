
var _ = require('lodash');

var application = 'AwesomeApp';
var neededSkillSets = [
    'moreAwesomeSkills',
    'awesomeSkills'
];

var redcore = require('./redcore');

var IdHelper = require('./Helpers/IdHelper');

var consumer = redcore.consumer.createConsumer({
    id: 'TestConsumer' + IdHelper.GetId(7),
    applicationId: application
});

var i = setInterval(function () {
    consumer.needSkillSet(neededSkillSets[0], {
        timeout: 5
    }, function (error) {
        if (error !== null) {
            consumer.postJob(neededSkillSets[0], 'awesomeMethod1', {
                awesomeness1: true
            }, function (error, product, meta) {
                if (_.isUndefined(error)) {
                    console.log("Response to " + meta.needSkillSet + "'s " + meta.skillName + " job:");
                    console.log(product);
                    console.log(meta);
                }
                else {
                    console.error(error);
                }
            });
        }
        else {
            //TODO
            console.error(error);
        }
    });
}, 50);

setTimeout(function () {
    clearInterval(i);
}, 100000);

//consumer.postJob(neededSkillSets[1], 'awesomeMethod2', {
//    awesomeness2: true
//}, function (error, product, meta) {
//    if (_.isUndefined(error)) {
//        console.log("Response to " + meta.needSkillSet + "'s " + meta.skillName + " job:");
//        console.log(product);
//        console.log(meta);
//    }
//    else {
//        console.error(error);
//    }
//});
