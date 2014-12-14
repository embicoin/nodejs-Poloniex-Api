/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var clc = require('cli-color');

function Logger(app) {
    var self = this;
    
    self._app = app;
}

Logger.prototype.info = function (fn, func, args) {
    var self = this;
    
    if (self._app._logwin !== undefined) {
        self._app._logwin.write(new Date().toISOString(), clc.bold.green("INFO   "), fn, func, args);
    }
};

Logger.prototype.warn = function (fn, func, args) {
    var self = this;
    
    if (self._app._logwin !== undefined) {
        self._app._logwin.write(new Date().toISOString(), clc.bold.yellow("WARN   "), fn, func, args);
    }
};

Logger.prototype.error = function (fn, func, args) {
    var self = this;
    
    if (self._app._logwin !== undefined) {
        self._app._logwin.write(new Date().toISOString(), clc.bold.red("ERROR  "), fn, func, args);
    }
};

Logger.prototype.time = function () {
    var self = this,
        start = Date.now();
    
    return function (fn, func, args) {
        var took = (Date.now() - start);

        if (self._app._logwin !== undefined) {
            self._app._logwin.write(new Date().toISOString(), clc.bold.blue(('     ' + took).slice(-5) + 'ms'), fn, func, args);
        }
    };
};

module.exports.Logger = Logger;