/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var async = require('async'),
    fs = require('fs');

function LogCallback(parent, name, callback) {
    var self = this,
        i;
    
    self._callback = callback;
    self._callback.ctx = self;
    self._name = name;
    self._depth = (parent === undefined ? 0 : parent._depth + 1);
    self._depthString = '';
    for (i = 0; i < self._depth; i++) {
        self._depthString += '  ';
    }
    // console.log(self._depthString, 'init', self._name);
    
    self.callback = function (err, data) {
        var s, r;
        
        console.log(self._depthString, 'call', self._name, 'args', err, data);
        s = Date.now();
        r = self._callback(err, data);
        console.log(self._depthString, 'returns', self._name, r, 'after', Date.now() - s, 'ms');
    };
}

// console.log('WRITE');
fs.writeFile('message.txt', 'Just now, we have created this file',
    new LogCallback(undefined, 'fs.writeFile: WRITTEN', function (err) {
        // console.log('WRITTEN', this._name);
        // console.log('READ');
        fs.readFile('message.txt',
            new LogCallback(this, 'fs.readFile 1: READ', function (err, data) {
                // console.log('READED', this._name);
                // console.log('UNLINK');
                fs.unlink('message.txt',
                    new LogCallback(this, 'fs.unlink: UNLINKED', function (err, data) {
                        // console.log('UNLINKED', this._name);
                    }).callback);
            }).callback);
        fs.readFile('message.txt',
            new LogCallback(this, 'fs.readFile 2: READ', function (err, data) {
                // console.log('READED', this._name);
                // console.log('UNLINK');
                fs.unlink('message.txt',
                    new LogCallback(this, 'fs.unlink: UNLINKED', function (err, data) {
                        // console.log('UNLINKED', this._name);
                    }).callback);
            }).callback);

    }).callback);