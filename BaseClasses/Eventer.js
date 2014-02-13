
var util = require('util');
var events = require('events');
var _ = require('lodash');

function Eventer() {
    if ((this instanceof Eventer) === false) {
        return new Eventer();
    }
    events.EventEmitter.call(this);
}
util.inherits(Eventer, events.EventEmitter);

Eventer.prototype._setupEvents = function () {
    var instance = this;
    this.on('dispose', function () {
        instance._dispose.apply(instance, arguments);
    });
};

Eventer.prototype._dispose = function () {
    var instance = this;
    _.each(this._events, function (event) {
        instance.removeAllListeners(event);
    });
};

module.exports = Eventer;
