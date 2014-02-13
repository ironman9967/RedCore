
exports.GetId = function (length) {
    var id = "ID_";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        id += possible.charAt(Math.round(Math.random() * (possible.length - 1)));
    }
    return id;
};
