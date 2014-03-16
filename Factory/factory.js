
var _ = require('lodash');

var ArgsHelper = require('../Helpers/ArgsHelper');
var OptionsHelper = require('../Helpers/OptionsHelper');

var Foreman = require('./Classes/Foreman');

var parsedArgs = ArgsHelper.ParseArgs(_.rest(process.argv, 2));
parsedArgs.options = OptionsHelper.Validate({
    workerWaitForJobTimeoutInSeconds: 5,
    redisConnectionTimeoutInSeconds: 5,
    redisPort: process.env.REDCORE_PORT,
    redisHost: process.env.REDCORE_HOST
}, parsedArgs.options);

var foreman = new Foreman(parsedArgs.arguments, parsedArgs.options);

foreman.emit('startWork');
