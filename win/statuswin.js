/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var util = require('util'),
    win = require('./win'),
    clc = require('cli-color');

function StatusWin(windows) {
    var self = this,
        fn;
    
    win.Win.call(self, windows, {
        top: 0,
        left: 0,
        width: '100%',
        height: 6,
        style: { bg: 'black' }
    });

    setInterval(function () { self._build(); }, 500);
}
util.inherits(StatusWin, win.Win);

StatusWin.prototype._build = function () {
    var self = this,
        content = '',
        basep = '',
        btc,
        xmr,
        total,
        lasthigh = '',
        lastlow = '',
        lh,
        ll,
        buys = '',
        sells = '',
        i,
        order,
        wins,
        win;
    
    try {
        
        btc = ' BTC: '
            + ('         ' + (self._windows._app.stores.Poloniex.BTC.available + self._windows._app.stores.Poloniex.BTC.onorders).toFixed(5)).slice(-8);
        
        xmr = ' XMR: '
            + ('         ' + (self._windows._app.stores.Poloniex.XMR.available + self._windows._app.stores.Poloniex.XMR.onorders).toFixed(5)).slice(-8);

        if (self._windows._app.stores.Poloniex.BTC.XMR.trades === undefined) {
            basep = '            ' + ('                            ').slice(-8);
        } else {
            basep = ' XMR Base:  '
                + ('         ' + (self._windows._app.stores.Poloniex.BTC.XMR.trades.baseprice).toFixed(5)).slice(-8);
        }
        
        total = ' Total BTC: '
            + ('         ' + (self._windows._app.stores.Poloniex.BTC.available + self._windows._app.stores.Poloniex.BTC.onorders + self._windows._app.stores.Poloniex.XMR.btcvalue).toFixed(5)).slice(-8);
        
        for (i = 0; i < self._windows._app.stores.Poloniex.BTC.XMR.ticker.history.length; i++) {
            if (lh === undefined || parseFloat(self._windows._app.stores.Poloniex.BTC.XMR.ticker.history[i].last) > lh) {
                lh = parseFloat(self._windows._app.stores.Poloniex.BTC.XMR.ticker.history[i].last);
                lasthigh = ' Last+: '
                    + clc.bold(parseFloat(self._windows._app.stores.Poloniex.BTC.XMR.ticker.history[i].last).toFixed(6));
            }
            if (ll === undefined || parseFloat(self._windows._app.stores.Poloniex.BTC.XMR.ticker.history[i].last) < ll) {
                ll = parseFloat(self._windows._app.stores.Poloniex.BTC.XMR.ticker.history[i].last);
                lastlow = ' Last-: '
                    + clc.bold(parseFloat(self._windows._app.stores.Poloniex.BTC.XMR.ticker.history[i].last).toFixed(6));
            }
        }
        
        if (self._windows._app.stores.Poloniex.BTC.XMR.orders !== undefined) {
            buys =  ' BUYS  ';
            sells = ' SELLS ';

            self._windows._app.stores.Poloniex.BTC.XMR.orders.sort(function (a, b) {
                return parseFloat(a.amount) > parseFloat(b.amount);
            });

            for (i = 0; i < self._windows._app.stores.Poloniex.BTC.XMR.orders.length; i++) {
                order = self._windows._app.stores.Poloniex.BTC.XMR.orders[i];
                if (order.type === 'buy') {
                    buys += ('      ' + parseFloat(order.amount).toFixed(2)).slice(-5)
                        + ' @'
                        + clc.bold.green(('      ' + parseFloat(order.rate).toFixed(5)).slice(-8));
                }
                if (order.type === 'sell') {
                    sells += ('      ' + parseFloat(order.amount).toFixed(2)).slice(-5)
                        + ' @'
                        + clc.bold.red(('      ' + parseFloat(order.rate).toFixed(5)).slice(-8));
                }
            }
        }
        
        wins = '';
        for (i = 0; i < self._windows._app._windows._windows.length; i++) {
            win = self._windows._app._windows._windows[i];
            if (win.key !== undefined) {
                if (win.isVisible) {
                    wins += ' ' + clc.bold(win.title);
                } else if (win.hasChanges) {
                    wins += ' ' + clc.green(win.title.substr(0, 3)) + win.title.substr(3);
                } else {
                    wins += ' ' + win.title;
                }
                
            }
        }
        
        wins += ' ---- (Q)uit ---- Last: '
            + (self._windows._app._lastUpdate === undefined
                ? 'NEVER'
                : (parseInt((Date.now() - self._windows._app._lastUpdate) / 1000).toString()) + 'secs'
              );
        
        content = '\r\n'
            + btc
            + total
            + lasthigh
            + buys
            + '\r\n'
            + xmr
            + basep
            + lastlow
            + sells
            + '\r\n\r\n'
            + wins;
        
        self.setContent(content);
        
    } catch (e) {
        self.setContent('Loading');
        self.setContent(e.toString() + '\r\n' + e.stack);
        // self._windows._app.log.error('win/statuswin', 'StatusWin.prototype.build', e);
    }

};

module.exports.StatusWin = StatusWin;