/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var events = require('events'),
    util = require('util');

function Ticker(app, stores, exchange, currencyPair) {
    var self = this;
    
    self._app = app;
    self._exchange = exchange;
    self._currencyPair = currencyPair;
    self.history = [];

    self._app.exchanges[self._exchange].on('orderbook', function (args) {
        var i,
            tick,
            c;
    
        if (args.currencyPair[0] === self._currencyPair[0] && args.currencyPair[1] === self._currencyPair[1]) {
            for (i = 0; i < args.length; i++) {
                c = args[i];
                if (c.type === 'newTrade') {
                    tick = { exchange: self._exchange, currencyPair: self._currencyPair, last: parseFloat(c.data.rate), date: Date.parse(c.data.date), amount: parseFloat(c.data.amount), type: c.data.type };

                    while (self.history.length > 0 && self.history[0].date > (Date.now() - 24 * 60 * 60 * 1000)) {
                        self.history.splice(0, 1);
                    }

                    self.history.push(tick);

                    self._app.stores._emitticker(tick);
                }
            }
        }
    });
}

module.exports.Ticker = Ticker;