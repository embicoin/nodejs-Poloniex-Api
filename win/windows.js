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
    tickerWin = require('./tickerwin'),
    orderbookWin = require('./orderbookwin'),
    blessed = require('blessed');

function Windows(app) {
    var self = this,
        i;
    self._app = app;
    
    self._screen = blessed.screen();
    
    self._winStatus = new statusWin.StatusWin(self);
    self._winTicker = new tickerWin.TickerWin(self);
    self._winHistory = new historyWin.HistoryWin(self);
    self._winLog = new logWin.LogWin(self);
    self._winChart = new chartWin.ChartWin(self);
    self._winOrderbook = new orderbookWin.OrderbookWin(self);
    self._windows = [
        self._winStatus,
        self._winTicker,
        self._winOrderbook,
        self._winHistory,
        self._winChart,
        self._winLog
    ];
    
    self._bg = blessed.box({ top: 0, left: 0, bottom: 0, right: 0, style: { bg: 'white' } });
    self._screen.append(self._bg);
    
    for (i = 0; i < self._windows.length; i++) {
        self._screen.append(self._windows[i]._box);
    }
    
    self._winStatus.show();
    self._winTicker.show();
    self._winOrderbook.show();
    
    self._screen.remove(self._winHistory._box);
    self._screen.append(self._winHistory._box);
    self._winHistory.show();
    
    self._app.program.on('keypress', function (ch, key) {
        var i,
            win,
            found;

        if (key.name.toLowerCase() === 'q') {
            self._app.log.warn('app', 'App.prototype.quit', 'SHUTTING DOWN');
            self._app.quit();
        } else {
            
            for (i = 0; i < self._windows.length; i++) {
                win = self._windows[i];

                if (win.key !== undefined) {
                    if (key.name.toLowerCase() === win.key) {
                        found = true;
                    }
                }
            }
            
            if (found) {
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
            }
        }
    });

}

module.exports.Windows = Windows;