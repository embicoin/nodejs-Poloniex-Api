/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var util = require('util'),
    async = require('async');

function Trader(app) {
    var self = this;
    
    self._app = app;
    self._ratelimit = undefined;
    self._current = [];
    
    self._app.stores.on('BTC_XMR', function (args) { self._tick(args); });
}

Trader.prototype._tick = function (args) {
    var self = this,
        i,
        ii,
        fnRateLimit,
        target,
        ct,
        tt,
        cr,
        tr,
        found,
        todo = [];
    
    if (self._stopped !== undefined) { return; }
    
    if (self._ratelimit !== undefined) { return; }
    self._ratelimit = 'on';
    
    target = self.check(
        undefined,
        undefined,
        self._app.stores.Poloniex.BTC.XMR.orderbook.orderbook.orderbook
    );
    
    self._app._lastUpdate = Date.now();

    for (i = 0; i < self._current.length; i++) {
        found = false;
        ct = self._current[i];
        cr = ct.rate.toFixed(6).toString();
        
        for (ii = 0; ii < target.length; ii++) {
            tt = target[ii];
            tr = tt.rate.toFixed(6).toString();
            
            if (tr === cr && tt.type === ct.type && ct.amount === tt.amount) {
                tt.orderNumber = ct.orderNumber;
                found = true;
                break;
            }
        }
        
        if (!found) {
            todo.push({ type: 'cancel', orderNumber: ct.orderNumber, order: { rate: parseFloat(ct.rate).toFixed(6), amount: parseFloat(ct.amount).toFixed(2), orderNumber: ct.orderNumber }});
        }
    }
    
    for (i = 0; i < target.length; i++) {
        found = false;
        tt = target[i];
        tr = tt.rate.toFixed(6).toString();
        
        for (ii = 0; ii < self._current.length; ii++) {
            ct = self._current[ii];
            cr = ct.rate.toFixed(6).toString();
            
            if (tr === cr && tt.type === ct.type && ct.amount === tt.amount) {
                tt.orderNumber = ct.orderNumber;
                found = true;
                break;
            }
        }
        
        if (!found) {
            todo.push({ type: 'set', order: tt, target: i });
        }
    }
    
    if (todo.length > 0) {
        async.eachSeries(todo,
            function (item, callback) {
                var cb = callback,
                    oin = item.orderNumber;

                if (item.type === 'cancel') {
                    self._app.exchanges.Poloniex.cancel_order(['BTC', 'XMR'], oin, function (err, result) {
                        if (err !== undefined) {
                            self._app.log.error('trader/trader', 'cancel', err);
                        } else {
                            self._app._windows._winHistory.write('cancel', { rate: parseFloat(item.order.rate).toFixed(6), amount: parseFloat(item.order.amount).toFixed(2), orderNumber: oin });
                            self._app.log.info('trader/trader', 'cancel', oin);
                        }
                        cb(err, result);
                    });
                }
                if (item.type === 'set') {

                    if (item.order.type === 'ask') {
                        self._app.exchanges.Poloniex.sell(['BTC', 'XMR'], item.order.amount, item.order.rate, function (err, result) {
                            target[item.target].orderNumber = result.orderNumber;
                            if (err !== undefined) {
                                self._app.log.error('trader/trader', 'sell', { rate: parseFloat(item.order.rate).toFixed(6), amount: parseFloat(item.order.amount).toFixed(2), orderNumber: result.orderNumber, error: err });
                            } else {
                                self._app._windows._winHistory.write('sell', { rate: parseFloat(item.order.rate).toFixed(6), amount: parseFloat(item.order.amount).toFixed(2), orderNumber: result.orderNumber });
                                self._app.log.info('trader/trader', 'sell', { rate: parseFloat(item.order.rate).toFixed(6), amount: parseFloat(item.order.amount).toFixed(2), orderNumber: result.orderNumber });
                            }
                            cb(err, result);
                        });
                    }
                    
                    if (item.order.type === 'bid') {
                        self._app.exchanges.Poloniex.buy(['BTC', 'XMR'], item.order.amount, item.order.rate, function (err, result) {
                            target[item.target].orderNumber = result.orderNumber;

                            if (err !== undefined) {
                                self._app.log.error('trader/trader', 'buy', { rate: parseFloat(item.order.rate).toFixed(6), amount: parseFloat(item.order.amount).toFixed(2), orderNumber: result.orderNumber, error: err });
                            } else {
                                self._app._windows._winHistory.write('buy', { rate: parseFloat(item.order.rate).toFixed(6), amount: parseFloat(item.order.amount).toFixed(2), orderNumber: result.orderNumber });
                                self._app.log.info('trader/trader', 'buy', { rate: parseFloat(item.order.rate).toFixed(6), amount: parseFloat(item.order.amount).toFixed(2), orderNumber: result.orderNumber });
                            }
                            cb(err, result);
                        });
                    }
                }
            },
            function (err) {
                self._current = target;
                setTimeout(function () { self._ratelimit = undefined; }, 5000);
                if (err !== undefined) {
                    self._app.log.error('trader/trader', 'Check', err);
                }
                self._app.stores.Poloniex._forceOrderUpdate = true;
            });
    } else {
        setTimeout(function () { self._ratelimit = undefined; }, 5000);
        // self._app.log.info('trader/trader', 'DONE', self._current);   
    }
    
};

Trader.prototype.stop = function () {
    var self = this;
    self._stopped = true;
};

Trader.prototype.check = function () { };

module.exports.Trader = Trader;