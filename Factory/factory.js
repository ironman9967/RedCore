
var _ = require('lodash');

var Foreman = require('./Classes/Foreman');

var foreman = new Foreman(_.rest(process.argv, 2));

foreman.emit('startWork');
