/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var events = require('events'),
    util = require('util');

function Orderbook(app, stores, exchange, currencyPair) {
    var self = this,
        updateOrderbook;
    
    self._app = app;
    self._exchange = exchange;
    self._currencyPair = currencyPair;
    self.orderbook = { };
    
    updateOrderbook = function () {
        self._updateorderbook(function (err, orderbook) {
            setTimeout(updateOrderbook, self._app.config.get('Symbols:' + self._exchange + ':FullOrderbookRefreshTimeout'));
        });
    };

    updateOrderbook();
    
    self._app.exchanges[self._exchange].on('orderbook', function (args) {
        var i,
            c;
        
        if (self.orderbook.orderbook.bids === undefined) {
            self._app.log.info('lib/store/orderbook', 'Orderbook', 'orderbook not yet loaded, skipping update');
            return;
        }
        
        if (args.currencyPair[0] === self._currencyPair[0] && args.currencyPair[1] === self._currencyPair[1]) {
            for (i = 0; i < args.length; i++) {
                c = args[i];
                if (c.type === 'orderBookRemove') {
                    self._removefromorderbook(c.data.rate, c.data.type);
                } else if (c.type === 'orderBookModify') {
                    self._modifyorderbook(c.data.rate, c.data.amount, c.data.type);
                }
            }
            
            self._app.stores._emitorderbook(self.orderbook);
        }
        
    });
}

Orderbook.prototype._modifyorderbook = function (rate, amount, bidask) {
    var self = this,
        i,
        found = false;
    
    bidask += 's';
    
    for (i = 0; i < self.orderbook.orderbook[bidask].length; i++) {
        if (self.orderbook.orderbook[bidask][i][0] === rate) {
            
            self.orderbook.orderbook[bidask][i][1] = amount;
            found = true;
            break;
            
        } else if (bidask === 'bids' && self.orderbook.orderbook[bidask][i][0] < rate) {
            
            self.orderbook.orderbook[bidask].splice(i, 0, [rate, amount]);
            found = true;
            break;
            
        } else if (bidask === 'asks' && self.orderbook.orderbook[bidask][i][0] > rate) {
           
            self.orderbook.orderbook[bidask].splice(i, 0, [rate, amount]);
            found = true;
            break;
            
        }
    }
    
    if (!found) {
        self.orderbook.orderbook[bidask].push([rate, amount]);
    }
};

Orderbook.prototype._removefromorderbook = function (rate, bidask) {
    var self = this,
        i,
        found = false;
    
    bidask += 's';
    
    for (i = 0; i < self.orderbook.orderbook[bidask].length; i++) {
        if (self.orderbook.orderbook[bidask][i][0] === rate) {
            self.orderbook.orderbook[bidask].splice(i, 1);
            found = true;
            break;
        }
    }

};

Orderbook.prototype._updateorderbook = function (callback) {
    var self = this;
    
    self._app.exchanges[self._exchange].get_orderbook(self._currencyPair, function (err, orderbook) {
       
        if (err !== undefined) {
            callback(err, orderbook);
            return;
        }
        
        self.orderbook.orderbook = orderbook;
        self.orderbook.currencyPair = self._currencyPair;
        self.orderbook.exchange = self._exchange;

        self._app.stores._emitorderbook(self.orderbook);
        
        callback(err, orderbook);
    });
};

module.exports.Orderbook = Orderbook;