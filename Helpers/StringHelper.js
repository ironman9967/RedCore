
var _ = require('lodash');

exports.CapFirstLetter = function (str) {
    if (_.isUndefined(str)) {
        return void 0;
    }
    else if (str.length === 1) {
        return str.toUpperCase();
    }
    else {
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }
};
