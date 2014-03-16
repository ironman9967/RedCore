
exports.ParseArgs = function (args) {
    var results = {
        options: {},
        flags: [],
        arguments: []
    };
    while (args.length > 0) {
        var arg = args.pop();
        if (arg.indexOf('-') === 0) {
            results.flags.push(arg.substring(1));
        }
        else if (arg.indexOf('=') > 0) {
            results.options[arg.substring(0, arg.indexOf('='))] = arg.substring(arg.indexOf('=') + 1);
        }
        else {
            results.arguments.push(arg);
        }
    }
    return results;
};