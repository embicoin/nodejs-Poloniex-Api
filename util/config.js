/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var events = require('events'),
    util = require('util'),
    nconf = require('nconf'),
    path = require('path');

function Configuration(app, fname) {
    var self = this;
    
    events.EventEmitter.call(this);
    
    self._app = app;
    self._fname = fname;
    self._nconf = new nconf.Provider({
        argv: true,
        store: {
            type: 'file',
            file: path.join(__dirname, '..', fname)
        }
    });
}
util.inherits(Configuration, events.EventEmitter);

Configuration.prototype.get = function (key) {
    var self = this;
    return self._nconf.get(key);
};

Configuration.prototype.set = function (key, value) {
    var self = this;
    self._nconf.set(key, value);
    self.emit('set', {key: key, value: value});
    self._app.log.info('util/config', 'Configuration.prototype.set', { key: key, vlue: value });
};

Configuration.prototype.save = function () {
    var self = this;
    self._nconf.save(function (err) {
        if (err !== undefined) {
            self._app.log.error('util/config', 'Configuration.prototype.save', err);
        } else {
            self._app.log.info('util/config', 'Configuration.prototype.save', 'OK');
            self.emit('saved');
        }
    });
};

module.exports.Configuration = Configuration;