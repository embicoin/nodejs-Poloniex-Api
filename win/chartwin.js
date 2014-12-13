/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var util = require('util'),
    win = require('./win'),
    blessed = require('blessed'),
    strftime = require('strftime'),
    clc = require('cli-color');

function ChartWin(windows) {
    var self = this;

    win.Win.call(this, windows, {
        top: 7,
        bottom: 0,
        left: 1,
        width: '100%',
        height: '100%'
    },
        'c',
        '(C)hart');

    self._boxTicker = blessed.box({
        right: 0,
        bottom: 0,
        width: 26,
        height: Math.floor(self._box.height / 2),
        style: { bg: 'black' }
    });
    self._boxTicker.setContent('ticker');
    self._box.append(self._boxTicker);
    
    self._windows._app.stores.on('BTC_XMR', function (data) {
        if (data.type === 'orderbook') {
            self._build(data);
        }
    });
}
util.inherits(ChartWin, win.Win);

ChartWin.prototype._build = function (data) {
    var self = this,
        i,
        cHistory = [],
        h,
        l;
    
    try {

        // { exchange: self._exchange, currencyPair: self._currencyPair, last: c.data.rate, date: Date.parse(c.data.date) };
        for (i = self._windows._app.stores.Poloniex.BTC.XMR.ticker.history.length - 1; i >= 0; i--) {
            h = self._windows._app.stores.Poloniex.BTC.XMR.ticker.history[i];
            l = strftime('%H:%M:%S', h.date)
                + ' '
                + ('          ' + h.last.toFixed(5)).slice(-8)
                + ' '
                + ('          ' + h.amount.toFixed(2)).slice(-7);
            
            if (h.type === 'sell') {
                l = clc.red(l);
            } else {
                l = clc.green(l);
            }
            cHistory.push(l);
        }
        
        self._boxTicker.setContent(cHistory.join('\r\n'));
        
    } catch (e) {
        self._windows._app.log.error('win/chartwin', 'ChartWin.prototype.build', e);
    }
    
    self.setContent('Loading...');
    self._windows._screen.render();
    
    return;
    /*
    var self = this,
        width = self._box.width,
        height = self._box.height,
        content = [self._box.height],
        i;

    try {
        for(i = 0; i < 
        self.setContent(width + ' ' + height);

    } catch (e) {
        self.log.error('win/chartwin', 'ChartWin.prototype.build', e);
    }*/

};

module.exports.ChartWin = ChartWin;