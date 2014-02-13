
var _ = require('lodash');

exports.Validate = function (defaults, options) {
    var validated = defaults;
    if (!_.isUndefined(options)) {
        _.each(options, function (value, name) {
            if (_.indexOf(_.keys(validated), name) >= 0) {
                validated[name] = value;
            }
        });
    }
    return validated;
};
