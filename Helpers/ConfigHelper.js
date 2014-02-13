
var fs = require('fs');

exports.LoadConfigFile = function (configFilePath, callback) {
    var reader = fs.createReadStream(configFilePath, {
        encoding: "utf8"
    });
    reader.on('data', function (data) {
        callback(JSON.parse(data));
    });
};
