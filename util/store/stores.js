/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var events = require('events'),
    util = require('util'),
    store = require('./store');

function Stores(app) {
    events.EventEmitter.call(this);
    
    var self = this,
        i,
        exchange,
        symbols = app.config.get('Symbols');
    
    self._app = app;

    for (exchange in symbols) {
        if (symbols.hasOwnProperty(exchange)) {
            if (self[exchange] === undefined) {
                self[exchange] = new store.Store(app, self, exchange);
            }
        }
    }
    
}
util.inherits(Stores, events.EventEmitter);

Stores.prototype._emitticker = function (args) {
    var self = this;
    self.emit('ticker', args);
    self.emit(args.currencyPair[0] + '_' + args.currencyPair[1], { type: 'ticker', data: args });
};

Stores.prototype._emitorderbook = function (args) {
    var self = this;
    self.emit('orderbook', args);
    self.emit(args.currencyPair[0] + '_' + args.currencyPair[1], { type: 'orderbook', data: args });
};

Stores.prototype._emitbalance = function (args) {
    var self = this,
        balance = { exchange: args.exchange, currency: args.currency, balance: { available: args.balance.available, onorders: args.balance.onorders, btcvalue: args.balance.btcvalue } };
    
    self.emit('balance', balance);
};

Stores.prototype._emittrades = function (args) {
    var self = this;
    self.emit('trades', args);
    self.emit(args.currencyPair[0] + '_' + args.currencyPair[1], { type: 'trades', data: args });
};

Stores.prototype._emitorders = function (args) {
    var self = this;
    self.emit('orders', args);
    self.emit(args.currencyPair[0] + '_' + args.currencyPair[1], { type: 'orders', data: args });
};

module.exports.Stores = Stores;