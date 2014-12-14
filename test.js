/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var async = require('async'),
    fs = require('fs');

function LogCallback(parent, name, callback) {
    var self = this,
        i,
        cur;
    
    self._callback = callback;
    self._callback.ctx = self;
    self._name = name;
    self._parent = parent;
    self._depth = '';
    self._start = Date.now();
    
    self._depthString = '[' + self._name;
    cur = parent;
    while (cur !== undefined) {
        self._depthString += '>' + cur._name;
        cur = cur._parent;
    }
    self._depthString += ']';
    
    for (i = 0; i < self._depth; i++) {
        self._depthString += '  ';
    }
    // console.log(self._depthString, ' INIT ');
    
    self.callback = function (err, data) {
        var s, r;
        
        console.log(self._depthString, 'CALL  ', '(' + err + ', ' + data + ')');
        s = Date.now();

        try {
            r = self._callback(err, data);
            console.log(self._depthString, 'RETURN', r, 'took', Date.now() - s, 'ms', Date.now() - self._start, 'ms since INIT');
        } catch (e) {
            if (s !== 0) {
                s = 'took ' + (Date.now() - s) + ' ms ' + (Date.now() - self._start) + ' ms since INIT';
            } else {
                s = '';
            }
            console.log(self._depthString, 'THREW ', e.toString(), s);
        }
    };
}

// console.log('WRITE');
fs.writeFile('message.txt', 'Just now, we have created this file',
    new LogCallback(undefined, 'fs.writeFile: WRITTEN', function (err) {
        var fn, self = this;
        // console.log('WRITTEN', this._name);
        // console.log('READ');
        fs.readFile('message.txt',
            new LogCallback(this, 'fs.readFile 1: READ', function (err, data) {
                // console.log('READED', this._name);
                // console.log('UNLINK');
                fs.unlink('message.txt',
                    new LogCallback(this, 'fs.unlink 1: UNLINKED', function (err, data) {
                        // console.log('UNLINKED', this._name);
                    }).callback);
                // console.log('READED', this._name);
                // console.log('UNLINK');
                fs.unlink('message.txt',
                    new LogCallback(this, 'fs.unlink 2: UNLINKED', function (err, data) {
                        throw new Error('Test');
                    }).callback);
            }).callback);
        fn = function () {
            fs.readFile('message.txt',
                new LogCallback(self, 'fs.readFile 2: READ', function (err, data) {
                    // console.log('READED', this._name);
                    // console.log('UNLINK');
                    fs.unlink('message.txt',
                        new LogCallback(this, 'fs.unlink 3: UNLINKED', function (err, data) {
                            // console.log('UNLINKED', this._name);
                        }).callback);
                }).callback);
        };

        setTimeout(fn, 1000);
    }).callback);