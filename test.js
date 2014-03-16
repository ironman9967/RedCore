
var util = require('util');

var x = new Buffer(1);
try {
    x.writeUInt8(5, 2);
} catch (error) {
    console.log(JSON.stringify({
        type: 'error',
        message: error.stack
    }));
}
