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
        top: 7,
        bottom: 0,
        left: 1,
        width: '100%',
        height: '100%'
    },
        'l',
        '(L)og');
    
    self._windows._app._logwin = self;
    self._lines = [];
}
util.inherits(LogWin, win.Win);

LogWin.prototype._print = function (content, obj) {
    var self = this, i;
    
    if (typeof obj === 'string' || obj instanceof String) {
        content += ' ' + obj.toString();
        
    } else if (obj instanceof Error) {
        content += ' ' + clc.red(obj.message) + '\r\n' + obj.stack;
        
    } else if (Object.prototype.toString.call(obj) === '[object Array]') {
        content += ' [';
        for (i = 0; i < obj.length; i++) {
            content += '\r\n #';
            content = self._print(content, obj[i]);
        }
        content += '\r\n]';
        
    } else {
        content += ' ' + JSON.stringify(obj);
    }
    
    return content;
};

LogWin.prototype.write = function (date, cat, fn, func, obj) {
    var self = this,
        content = date + ' ' + cat + ' ' + fn + ' ' + func;
    
    content = self._print(content, obj);
    
    self._lines.splice(0, 0, content);
    while (self._lines.length > 40) {
        self._lines.splice(self._lines.length - 1, 1);
    }
    
    self.setContent(self._lines.join('\r\n'));
};

module.exports.LogWin = LogWin;