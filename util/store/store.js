/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
/*jslint continue: true */
'use strict';

var orderbook = require('./orderbook'),
    ticker = require('./ticker'),
    async = require('async');

function Store(app, stores, exchange) {
    var i,
        self = this,
        pollExchange;
    
    self._app = app;
    self._stores = stores;
    self._exchange = exchange;
    self._forceOrderUpdate = false;
    self._currencyPairs = self._app.config.get('Symbols:' + exchange + ':CurrencyPairs');
    
    for (i = 0; i < self._currencyPairs.length; i++) {
        
        if (self[self._currencyPairs[i][0]] === undefined) {
            self[self._currencyPairs[i][0]] = {};
        }
        
        if (self[self._currencyPairs[i][1]] === undefined) {
            self[self._currencyPairs[i][1]] = {};
        }
        
        self[self._currencyPairs[i][0]][self._currencyPairs[i][1]] = {
            orderbook: new orderbook.Orderbook(app, self, exchange, self._currencyPairs[i]),
            ticker: new ticker.Ticker(app, self, exchange, self._currencyPairs[i])
        };
    }
    
    pollExchange = function () {
        
        self._updatebalance(function (err, result) {
            var upd = [];
            
            if (err !== undefined) {
                setTimeout(pollExchange, self._app.config.get('Symbols:' + self._exchange + ':PollTimeout'));
                return;
            }
            
            if (self._forceOrderUpdate) {
                self._forceOrderUpdate = false;
                upd.push(function (cb) { self._updateorders(cb); });
            }
            
            if (result.updatetrades) {
                upd.push(function (cb) { self._updatetrades(cb); });
            }
            
            async.parallel(upd, function () {
                setTimeout(pollExchange, self._app.config.get('Symbols:' + self._exchange + ':PollTimeout'));
            });
        });
        
    };
    
    pollExchange();
}

Store.prototype._updatetrades = function (callback) {
    var self = this,
        start = self._app.config.get('Symbols:' + self._exchange + ':Start');
    
    self._app.exchanges[self._exchange].get_tradehistory(undefined, start, function (err, history) {
        var i,
            ii,
            hasChanges,
            hist,
            price,
            vol;
        
        try {
            
            if (err !== undefined) {

                self._app.log.error('lib/store/store', 'Store.prototype.Store._updatetrades', err);

            } else {
                
                for (i = 0; i < self._currencyPairs.length; i++) {
                    hist = history[self._currencyPairs[i][0] + '_' + self._currencyPairs[i][1]];
                    
                    if (hist === undefined || hist.length === 0) {
                        continue;
                    }
                    
                    hasChanges = self[self._currencyPairs[i][0]] === undefined
                            || self[self._currencyPairs[i][0]][self._currencyPairs[i][1]] === undefined
                            || self[self._currencyPairs[i][0]][self._currencyPairs[i][1]].trades === undefined
                            || self[self._currencyPairs[i][0]][self._currencyPairs[i][1]].trades.lastorderid === undefined
                            || self[self._currencyPairs[i][0]][self._currencyPairs[i][1]].trades.lastorderid !== hist[hist.length - 1].tradeID;
                    
                    price = 0;
                    vol = 0;
                    for (ii = 0; ii < hist.length; ii++) {
                        if (hist[ii].type === 'buy') {
                            price += parseFloat(hist[ii].total);
                            vol += parseFloat(hist[ii].amount);
                        } else if (hist[ii].type === 'sell') {
                            price -= parseFloat(hist[ii].total);
                            vol -= parseFloat(hist[ii].amount);
                        }
                    }
                    
                    self[self._currencyPairs[i][0]][self._currencyPairs[i][1]].trades = hist;
                    self[self._currencyPairs[i][0]][self._currencyPairs[i][1]].trades.lastorderid = hist[hist.length - 1].tradeID;
                    self[self._currencyPairs[i][0]][self._currencyPairs[i][1]].trades.baseprice = price / vol;
                    
                    if (hasChanges) {
                        self._stores._emittrades({ exchange: self._exchange, currencyPair: self._currencyPairs[i], trades: self[self._currencyPairs[i][0]][self._currencyPairs[i][1]].trades });
                    }
                }
            }
            
        } catch (ex) {
            self._app.log.error('lib/store/store', 'Store.prototype.Store._updatetrades', ex);
        }
        
        callback();
 
    });
};

Store.prototype._updateorders = function (callback) {
    var self = this;
    
    self._app.exchanges[self._exchange].get_orders(undefined, function (err, orders) {
        try {
            var order, ii, hasChanges, iii, oin, found;

            if (err !== undefined) {

                self._app.log.error('lib/store/store', 'Store.prototype.Store._updateorders', err);

            } else {
                
                for (ii = 0; ii < self._currencyPairs.length; ii++) {
                    hasChanges = false;
                    order = orders[self._currencyPairs[ii][0] + '_' + self._currencyPairs[ii][1]];

                    if (order !== undefined) {
                        hasChanges = self[self._currencyPairs[ii][0]] === undefined
                            || self[self._currencyPairs[ii][0]][self._currencyPairs[ii][1]] === undefined
                            || self[self._currencyPairs[ii][0]][self._currencyPairs[ii][1]].orders === undefined
                            || self[self._currencyPairs[ii][0]][self._currencyPairs[ii][1]].orders.length !== order.length;

                        if (!hasChanges) {
                            for (iii = 0; iii < order.length; iii++) {
                                oin = order[iii].orderNumber;
                                found = false;
                                if (self[self._currencyPairs[ii][0]][self._currencyPairs[ii][1]].orders[iii].orderNumber === oin) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                hasChanges = true;
                            }
                        }

                        self[self._currencyPairs[ii][0]][self._currencyPairs[ii][1]].orders = order;

                        if (hasChanges) {
                            self._stores._emitorders({ exchange: self._exchange, currencyPair: self._currencyPairs[ii], orders: self[self._currencyPairs[ii][0]][self._currencyPairs[ii][1]].orders });
                        }
                    }
                }
            }
        } catch (ex) {
            self._app.log.error('lib/store/store', 'Store.prototype.Store._updateorders', ex);
        }
        
        callback();
    });
};

Store.prototype._updatebalance = function (callback) {
    var self = this,
        result = { updateorders: false, updatetrades: false };

    self._app.exchanges[self._exchange].get_balance(function (err, balances) {
        var currency,
            hasChanges,
            balanceChanged = false;

        if (err !== undefined) {

            self._app.log.error('lib/store/store', 'Store.prototype.Store._updatebalance', err);

        } else {

            try {

                for (currency in balances) {

                    if (balances.hasOwnProperty(currency) && self[currency] !== undefined) {
                        hasChanges = self[currency] === undefined;

                        if (!hasChanges) { hasChanges = self[currency].available !== parseFloat(balances[currency].available); }
                        if (!hasChanges) { hasChanges = self[currency].onorders !== parseFloat(balances[currency].onOrders); }
                        // if (!hasChanges) { hasChanges = self[currency].btcvalue !== parseFloat(balances[currency].btcValue); }
                        
                        if (self[currency].available + self[currency].onorders !== parseFloat(balances[currency].available) + parseFloat(balances[currency].onOrders)) {
                            result.updatetrades = true;
                        }

                        self[currency].available = parseFloat(balances[currency].available);
                        self[currency].onorders = parseFloat(balances[currency].onOrders);
                        self[currency].btcvalue = parseFloat(balances[currency].btcValue);
                        
                        if (hasChanges) {
                            self._stores._emitbalance({ exchange: self._exchange, currency: currency, balance: self[currency]});
                            result.updateorders = true;
                        }
                    }
                }

            } catch (ex) {
                self._app.log.error('lib/store/store', 'Store.prototype.Store._updatebalance', ex);
            }
        }
        callback(err, result);
    });
};

module.exports.Store = Store;