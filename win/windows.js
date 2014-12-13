/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var util = require('util'),
    async = require('async'),
    statusWin = require('./statuswin'),
    chartWin = require('./chartwin'),
    historyWin = require('./historywin'),
    logWin = require('./logwin'),
    blessed = require('blessed');

function Windows(app) {
    var self = this;
    self._app = app;
    
    self._screen = blessed.screen();
    self._windows = [
        new statusWin.StatusWin(self),
        new historyWin.HistoryWin(self),
        new chartWin.ChartWin(self),
        new logWin.LogWin(self)
    ];
    
    self._screen.append(self._windows[0]._box);
    self._screen.append(self._windows[1]._box);
    self._screen.append(self._windows[2]._box);
    self._screen.append(self._windows[3]._box);
    
    self._windows[0].show();
    self._windows[3].show();
    
    self._app.program.on('keypress', function (ch, key) {
        var i,
            win;
        
        for (i = 0; i < self._windows.length; i++) {
            win = self._windows[i];
            
            if (win.key !== undefined) {
                self._screen.remove(win._box);
                win.hide();
                
                if (key.name.toLowerCase() === win.key) {
                    self._screen.append(win._box);
                    win.show();
                }
            }
        }

        if (key.name.toLowerCase() === 'q') {
            self._app.log.warn('app', 'App.prototype.quit', 'SHUTTING DOWN');
            self._app.quit();
        }
    });

}

module.exports.Windows = Windows;