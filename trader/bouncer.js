/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var util = require('util'),
    trader = require('./trader');

function Bouncer(app) {
    trader.Trader.call(this, app);
}
util.inherits(Bouncer, trader.Trader);

Bouncer.prototype.check = function (balance, ticker, orderbook) {
    var self = this,
        result = [],
        rate,
        vol,
        i,
        ii,
        settings;
    
    settings = [
        { percent: 5,  maxvol: 1, amount: 0.5, secpercent: 1 },
        { percent: 7,  maxvol: 2, amount: 2,   secpercent: 4 },
        { percent: 20, maxvol: 8, amount: 4,   secpercent: 8 }
    ];
    
    if (orderbook === undefined || orderbook.asks === undefined || orderbook.bids === undefined) {
        return result;
    }
    
    // bids
    for (i = 0; i < settings.length; i++) {
        rate = parseFloat(orderbook.asks[0][0]) * (1 - (settings[i].percent / 100));
        vol = 0;
        for (ii = 0; ii < orderbook.bids.length; ii++) {
            if (rate > parseFloat(orderbook.bids[ii][0])) {
                break;
            }

            vol += (parseFloat(orderbook.bids[ii][0]) * parseFloat(orderbook.bids[ii][1]));

            if (vol > settings[i].maxvol) {
                rate = parseFloat(orderbook.bids[ii][0]) + 0.000001;
                break;
            }
        }
        
        if (rate > parseFloat(orderbook.bids[0][0]) * (1 - (settings[i].secpercent / 100))) {
            rate = parseFloat(orderbook.bids[0][0]) * (1 - (settings[i].secpercent / 100));
        }
        
        result.push({ type: 'bid', rate: rate, amount: settings[i].amount });
    }
    
    // sells
    for (i = 0; i < settings.length; i++) {
        rate = parseFloat(orderbook.bids[0][0]) * (1 + (settings[i].percent / 100));
        vol = 0;
        for (ii = 0; ii < orderbook.asks.length; ii++) {
            if (rate < parseFloat(orderbook.asks[ii][0])) {
                break;
            }

            vol += (parseFloat(orderbook.asks[ii][0]) * parseFloat(orderbook.asks[ii][1]));

            if (vol > settings[i].maxvol) {
                rate = parseFloat(orderbook.asks[ii][0]) - 0.000001;
                break;
            }
        }
        
        if (rate > parseFloat(orderbook.asks[0][0]) * (1 + (settings[i].secpercent / 100))) {
            rate = parseFloat(orderbook.asks[0][0]) * (1 + (settings[i].secpercent / 100));
        }
        
        result.push({ type: 'ask', rate: rate, amount: settings[i].amount });
    }
    
    return result;
};

module.exports.Bouncer = Bouncer;