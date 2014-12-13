/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var util = require('util'),
    win = require('./win'),
    Table = require('cli-table'),
    clc = require('cli-color');

function HistoryWin(windows) {
    var self = this;
    
    win.Win.call(this, windows, {
        top: 7,
        bottom: 0,
        left: 1,
        width: '100%',
        height: '100%'
    },
        'h',
        '(H)istory');
    
    self._windows._app.stores.on('BTC_XMR', function (data) { if (data.type === 'trades') { self._build(data); } });
}
util.inherits(HistoryWin, win.Win);

HistoryWin.prototype._build = function (data) {
    var self = this,
        table,
        i,
        t;
    
    if (self._windows._app.stores.Poloniex === undefined
            || self._windows._app.stores.Poloniex.BTC === undefined
            || self._windows._app.stores.Poloniex.BTC.XMR === undefined
            || self._windows._app.stores.Poloniex.BTC.XMR.trades === undefined) {
        return;
    }

    try {

        table = new Table({
            head: ['Date', '', 'Rate', 'Amount', 'Total'],
            chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
            style : {compact : true, 'padding-left' : 1},
            colWidths: [27, 8, 15, 15, 15]
        });

        for (i = self._windows._app.stores.Poloniex.BTC.XMR.trades.length - 1; i >= 0; i--) {
            t = self._windows._app.stores.Poloniex.BTC.XMR.trades[i];
            table.push([
                t.date,
                t.type === 'sell' ? clc.red('SELL') : clc.green('BUY'),
                ('       ' + (parseFloat(t.rate).toFixed(6))).slice(-12),
                ('       ' + (parseFloat(t.amount).toFixed(6))).slice(-12),
                ('       ' + (parseFloat(t.total).toFixed(6))).slice(-12)
            ]);
        }

        self.setContent(table.toString());
    } catch (e) {
        self.log.error('win/historywin', 'HistoryWin.prototype.build', e);
    }

};

module.exports.HistoryWin = HistoryWin;