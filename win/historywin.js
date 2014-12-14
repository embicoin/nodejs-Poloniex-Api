/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var util = require('util'),
    win = require('./win'),
    clc = require('cli-color'),
    blessed = require('blessed');

function HistoryWin(windows) {
    var self = this;
    
    win.Win.call(this, windows, {
        top: 6,
        bottom: 0,
        left: 0,
        right: 27,
        style: { bg: '#191919' }
    },
        'h',
        '(H)istory');
    
    self._trades = blessed.box({
        top: 0,
        bottom: 0,
        left: 74,
        right: 1,
        style: { bg: '#191919' }
    });
    
    self._box.append(self._trades);
    
    self._height = self._box.height - 5;
    self._windows._app.stores.on('BTC_XMR', function (data) { if (data.type === 'trades') { self._build(data); } });
}
util.inherits(HistoryWin, win.Win);

HistoryWin.prototype.write = function (type, trade) {
    var self = this, l;
    
    self._trades.setLine(0, clc.bold('BouncerBot Orders'));
    self._trades.setLine(2, clc.bold('                     Date '
        + ' Action'
        + '        Rate '
        + '     Amount '
        + ' OrderNumber'
                                    ));
    
    l = ('                         ' + (new Date()).toISOString()).slice(-25)
        + ('              ' + type.toUpperCase()).slice(-8)
        + ('                ' + (parseFloat(trade.rate).toFixed(6))).slice(-12)
        + ('                ' + (parseFloat(trade.amount).toFixed(6))).slice(-12)
        + ('                ' + (trade.orderNumber)).slice(-13);

    if (type === 'buy') {
        l = clc.green(l);
    } else if (type === 'cancel') {
        l = clc.yellow(l);
    } else {
        l = clc.red(l);
    }
    
    self._trades.insertLine(3, l);
    self._windows._screen.render();
};

HistoryWin.prototype._build = function (data) {
    var self = this,
        lines = [],
        l,
        i,
        t;
    
    if (self._windows._app.stores.Poloniex === undefined
            || self._windows._app.stores.Poloniex.BTC === undefined
            || self._windows._app.stores.Poloniex.BTC.XMR === undefined
            || self._windows._app.stores.Poloniex.BTC.XMR.trades === undefined) {
        return;
    }

    try {
        
        lines.push(clc.bold('Executed Trades') + '\r\n');
        
        l = '                Date '
            + '           Rate '
            + '         Amount '
            + '          Total';
        
        lines.push(clc.bold(l));
        
        for (i = self._windows._app.stores.Poloniex.BTC.XMR.trades.length - 1; i >= 0; i--) {
            t = self._windows._app.stores.Poloniex.BTC.XMR.trades[i];
            
            l = ('                    ' + t.date).slice(-20)
                + ('                ' + (parseFloat(t.rate).toFixed(6))).slice(-16)
                + ('                ' + (parseFloat(t.amount).toFixed(6))).slice(-16)
                + ('                ' + (parseFloat(t.total).toFixed(6))).slice(-16);

            if (t.type === 'buy') {
                l = clc.green(l);
            } else {
                l = clc.red(l);
            }
            
            lines.push(l);
        }

        self.setContent(lines.join('\r\n'));
    } catch (e) {
        self._windows._app.log.error('win/historywin', 'HistoryWin.prototype.build', e);
    }

};

module.exports.HistoryWin = HistoryWin;