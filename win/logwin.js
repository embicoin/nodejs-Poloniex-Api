/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var util = require('util'),
    win = require('./win'),
    clc = require('cli-color');

function LogWin(windows) {
    var self = this;

    win.Win.call(this, windows, {
        top: 6,
        bottom: 0,
        left: 0,
        right: 27,
        style: { bg: '#191919' }
    },
        'l',
        '(L)og');
    
    self._windows._app._logwin = self;
    self._lines = [];
    self._width = self._box.width - 50;
}
util.inherits(LogWin, win.Win);

LogWin.prototype._print = function (content, obj) {
    var self = this, i, d;
    
    if (typeof obj === 'string' || obj instanceof String) {
        content += ' ' + obj.toString();
        
    } else if (obj instanceof Error) {
        content += ' ' + clc.red(obj.message) + '\r\n' + obj.stack;
        
    } else if (Object.prototype.toString.call(obj) === '[object Array]') {
        content += ' [';
        if (obj.length > 0) {
            for (i = 0; i < obj.length; i++) {
                content += '\r\n   ';
                content = self._print(content, obj[i]);
            }
            content += '\r\n]';
        } else {
            content += ']';
        }
        
    } else {
        d = JSON.stringify(obj);
        if (d.length > self._width) {
            d = '[' + d.length + '] ' + d.substr(0, self._width) + '...';
        }
        content += ' ' + d;
    }
    
    return content;
};

LogWin.prototype.write = function (date, cat, fn, func, obj) {
    var self = this,
        content = date
            + ' '
            + cat
            + ' '
            + ('                  ' + fn).slice(-20)
            + ' '
            + ('                  ' + func).slice(-18);
    
    content = self._print(content, obj);
    
    self._lines.splice(0, 0, content);
    while (self._lines.length > 40) {
        self._lines.splice(self._lines.length - 1, 1);
    }
    
    self.setContent(self._lines.join('\r\n'));
};

module.exports.LogWin = LogWin;