/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var microtime = require('microtime-nodejs');
var crypto = require('crypto');
var async = require('async');
var https = require('https');
var querystring = require('querystring');
var Curl = require('node-curl/lib/Curl');
var autobahn = require('autobahn');
var Transform = require("stream").Transform;
var events = require('events');
module.exports.Error = function () {};
var util = require("util");

function PoloniexApi() {
    this.key = '';
    this.secret = '';
}
util.inherits(PoloniexApi, events.EventEmitter);

PoloniexApi.prototype.buy = function (currencyPair, amount, rate, callback) {
    if (amount > 0.001) {
        this._query_tradeApi({ 'command': 'buy', 'currencyPair': currencyPair, 'rate': rate, 'amount': amount}, callback);
    } else {
        callback('amount too small');
    }
};

PoloniexApi.prototype.sell = function (currencyPair, amount, rate, callback) {
    if (amount > 0.001) {
        this._query_tradeApi({ 'command': 'sell', 'currencyPair': currencyPair, 'rate': rate, 'amount': amount}, callback);
    } else {
        callback('amount too small');
    }
};

PoloniexApi.prototype.get_orderbook = function (currencyPair, callback) {
    var self = this;
    self._query_publicApi({ 'command': 'returnOrderBook', 'currencyPair': currencyPair }, callback);
};

PoloniexApi.prototype.stream = function (currencyPair) {
    var update_orderbook,
        self = this,
        stream = new Transform({ objectMode: true });
    
    update_orderbook = function () {
        self.get_orderbook(currencyPair, function (err, result) {
            self._orderbook = result;
            stream.push({ type: 'full', orderbook: self._orderbook, currencyPair: currencyPair });
        });
    };
    
    update_orderbook();
    setInterval(update_orderbook, 1000 * 10);

    return stream;
};

PoloniexApi.prototype.connect = function (currencyPairs) {
    var self = this;
    
    self._connect(currencyPairs,
        function (symbol, args) {
            self.emit('market', { currencyPair: symbol, market: args });
        },
        function (args) {
            self.emit('ticker', args);
        });
};

PoloniexApi.prototype._connect = function (currencyPairs, callbackMarket, callbackTicker, callbackTrollbox) {
    var autobahn, wsuri, connection;
    
    autobahn = require('autobahn');
    wsuri = "wss://api.poloniex.com";
    connection = new autobahn.Connection({
        url: wsuri,
        realm: "realm1"
    });
     
    connection.onopen = function (session) {
        if (callbackMarket !== undefined && currencyPairs !== undefined && currencyPairs.length > 0) {
            async.each(currencyPairs, function (currencyPair, callback) {
                session.subscribe(currencyPair, function (args, kwargs) { callbackMarket(currencyPair, args); });
                callback();
            });
        }
        
        if (callbackTicker !== undefined) {
            session.subscribe('ticker', callbackTicker);
        }
        
        if (callbackTrollbox !== undefined) {
            session.subscribe('trollbox', callbackTrollbox);
        }
    };
                    
    connection.open();
};

PoloniexApi.prototype.get_balance = function (callback) {
    this._query_tradeApi({ 'command': 'returnCompleteBalances' }, callback);
};

PoloniexApi.prototype.get_orders = function (currencyPair, callback) {
    this._query_tradeApi({ 'command': 'returnOpenOrders', 'currencyPair': currencyPair }, callback);
};

PoloniexApi.prototype.cancel_order = function (currencyPair, orderNumber, callback) {
    this._query_tradeApi({ 'command': 'cancelOrder', 'currencyPair': currencyPair, 'orderNumber': orderNumber }, callback);
};

PoloniexApi.prototype.cancel_all_orders = function (callback) {
    var self = this;

    self.get_balance(function (err, balance) {

        if (err) {
            return callback(err, undefined);
        }

        async.forEach(Object.keys(balance), function (item, cb) {
            if (balance[item].onOrders > 0) {
                self.cancel_orders('BTC_' + item, cb);
            }
        }, function (err) {
            callback(err, undefined);
        });
    });
};

PoloniexApi.prototype.cancel_orders = function (currencyPair, callback) {
    var self = this;

    self.get_orders(currencyPair, function (err, orders) {

        if (err !== undefined) {
            return callback(err);
        }
        
        async.each(orders, function (oi, cb) {

            self.cancel_order(currencyPair, oi.orderNumber, cb);

        }, function (err) {
            return callback(err);
        });
    });
};

PoloniexApi.prototype._query_publicApi = function (req, callback) {
    try {
        var url, get_data, cmd = req, self = this;
        
        get_data = querystring.stringify(req);
        url = 'https://poloniex.com/public?' + get_data;
        
        https.get(url, function (res) {
            var body = '', data = '';

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                try {
                    data = JSON.parse(body);
                    callback(undefined, data);

                    self.emit('query', { cmd: cmd, result: data });
                } catch (e) {
                    module.exports.Error('PoloniexApi', '_query_publicApi', 'end', e);
                    callback(e, undefined);
                }
            });

        }).on('error', function (e) {
            module.exports.Error('PoloniexApi', '_query_publicApi', 'error', e);
            callback(e, undefined);
        });
    } catch (e) {
        module.exports.Error('PoloniexApi', '_query_publicApi', e);
        callback(e, undefined);
    }
};

PoloniexApi.prototype._query_tradeApi = function (req, callback) {
    var post_data, hash, sign, received, allow, options, r, headers, curl, self = this, cmd = req;

    allow = true; // req.command === 'returnCompleteBalances' || req.command === 'returnOpenOrders';
    req.nonce = microtime.now().toString();

    post_data = querystring.stringify(req);

    hash = crypto.createHmac('sha512', this.secret);
    hash.update(post_data);
    sign = hash.digest("hex");

    if (allow) {

        try {

            headers = [ 'Key: ' + self.key, 'Sign: ' + sign ];

            curl = new Curl();
            curl.setopt('URL', 'https://poloniex.com/tradingApi');
            curl.setopt('POST', 1);
            curl.setopt('POSTFIELDS', post_data);
            curl.setopt('HTTPHEADER', headers);

            received = '';

            curl.on('data', function (chunk) {
                received += chunk;
                return chunk.length;
            });

            curl.on('header', function (chunk) {
                return chunk.length;
            });

            curl.on('error', function (e) {
                module.exports.Error('PoloniexApi', '_query_tradeApi', 'curl error', e);
                callback(e, undefined);
                curl.close();
            });
    
            curl.on('end', function () {
                try {
                    var data = JSON.parse(received);
                    callback(undefined, data);
                    self.emit('query', { cmd: cmd, result: data });
                } catch (ex) {
                    module.exports.Error('PoloniexApi', '_query_tradeApi', 'parse error', ex, received);
                    callback(ex, received);
                }
        
                curl.close();
            });
    
            curl.perform();
            
        } catch (ee) {
            module.exports.Error('PoloniexApi', '_query_tradeApi', ee);
            callback(ee, received);
        }

    } else {
        module.exports.Error('PoloniexApi', '_query_tradeApi', 'Forbidden', JSON.stringify(req));
        callback(new Error('Not Allowed'), 'NYI');
    }

};

module.exports.PoloniexApi = PoloniexApi;
