/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var autobahn = require('autobahn'),
    crypto = require('crypto'),
    async = require('async'),
    https = require('https'),
    querystring = require('querystring'),
    Curl = require('node-curl/lib/Curl'),
    microtime = require('microtime'),
    events = require('events'),
    util = require('util');

function Poloniex(app) {
    events.EventEmitter.call(this);
    var self = this;
    
    self._app = app;
    self._connect();
}
util.inherits(Poloniex, events.EventEmitter);

Poloniex.prototype.buy = function (currencyPair, amount, rate, callback) {
    var self = this;
    self._query_tradeApi({ 'command': 'buy', 'currencyPair': currencyPair[0] + '_' + currencyPair[1], 'rate': rate, 'amount': amount}, callback);
};

Poloniex.prototype.sell = function (currencyPair, amount, rate, callback) {
    var self = this;
    self._query_tradeApi({ 'command': 'sell', 'currencyPair': currencyPair[0] + '_' + currencyPair[1], 'rate': rate, 'amount': amount}, callback);
};

Poloniex.prototype.get_orderbook = function (currencyPair, callback) {
    var self = this;
    self._query_publicApi({ 'command': 'returnOrderBook', 'currencyPair': currencyPair[0] + '_' + currencyPair[1] }, callback);
};

Poloniex.prototype.get_balance = function (callback) {
    var self = this;
    self._query_tradeApi({ 'command': 'returnCompleteBalances' }, callback);
};

Poloniex.prototype.get_orders = function (currencyPair, callback) {
    var self = this,
        cp = 'all';
    
    if (currencyPair !== undefined) {
        cp = currencyPair[0] + '_' + currencyPair[1];
    }
    
    self._query_tradeApi({ 'command': 'returnOpenOrders', 'currencyPair': cp }, callback);
};


Poloniex.prototype.get_tradehistory = function (currencyPair, start, callback) {
    var self = this,
        cp = 'all';
    
    if (currencyPair !== undefined) {
        cp = currencyPair[0] + '_' + currencyPair[1];
    }
    
    self._query_tradeApi({ 'command': 'returnTradeHistory', 'currencyPair': cp, start: start, end: 9999999999 }, callback);
};

Poloniex.prototype.cancel_order = function (currencyPair, orderNumber, callback) {
    this._query_tradeApi({ 'command': 'cancelOrder', 'currencyPair': currencyPair[0] + '_' + currencyPair[1], 'orderNumber': orderNumber }, callback);
};

Poloniex.prototype.cancel_orders = function (currencyPair, callback) {
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

Poloniex.prototype._query_publicApi = function (req, callback) {
    var self = this,
        get_data = querystring.stringify(req),
        url = 'https://poloniex.com/public?' + get_data,
        time = self._app.log.time();
    
    try {
        https.get(url, function (res) {
            var body = '';

            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', function () {
                try {
                    var data = JSON.parse(body);
                    time('exchanges/poloniex', 'Poloniex.prototype._query_publicApi', req, data);
                    callback(undefined, data);
                } catch (e) {
                    self._app.log.error('exchanges/poloniex', 'Poloniex.prototype._query_publicApi', e);
                    time('exchanges/poloniex', 'Poloniex.prototype._query_publicApi', e);
                    callback(e, undefined);
                }
            });

        }).on('error', function (e) {
            self._app.log.error('exchanges/poloniex', 'Poloniex.prototype._query_publicApi.onerror', e);
            time('exchanges/poloniex', 'Poloniex.prototype._query_publicApi', e);
            callback(e, undefined);
        });
    } catch (e) {
        this._app.log.error('exchanges/poloniex', 'Poloniex.prototype._query_publicApi.onerror', e);
        time('exchanges/poloniex', 'Poloniex.prototype._query_publicApi', e);
        callback(e, undefined);
    }
};

Poloniex.prototype._query_tradeApi = function (req, callback) {
    var post_data,
        self = this,
        hash = crypto.createHmac('sha512', self._app.config.get('Symbols:Poloniex:Secret')),
        sign,
        received,
        headers,
        time = self._app.log.time(),
        curl;

    req.nonce = microtime.now().toString();
    post_data = querystring.stringify(req);
    hash.update(post_data);
    sign = hash.digest("hex");

    try {
        headers = [ 'Key: ' + self._app.config.get('Symbols:Poloniex:Key'), 'Sign: ' + sign ];

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
            self._app.log.error('exchanges/poloniex', 'Poloniex.prototype._query_tradeApi.error', e);
            time('exchanges/poloniex', 'Poloniex.prototype._query_tradeApi.error', req);
            callback(e, undefined);
            curl.close();
        });

        curl.on('end', function () {
            try {
                
                var data = JSON.parse(received);
                time('exchanges/poloniex', 'Poloniex.prototype._query_tradeApi.end', req);
                callback(undefined, data);
                
            } catch (ex) {
                self._app.log.error('exchanges/poloniex', 'Poloniex.prototype._query_tradeApi.end', ex);
                time('exchanges/poloniex', 'Poloniex.prototype._query_tradeApi.end', req);
                callback(ex, received);
            }

            curl.close();
        });

        curl.perform();

    } catch (ee) {
        self._app.log.error('exchanges/poloniex', 'Poloniex.prototype._query_tradeApi', ee);
        time('exchanges/poloniex', 'Poloniex.prototype._query_tradeApi', req);
        callback(ee, received);
    }

};

Poloniex.prototype._connect = function () {
    var self = this,
        wsuri = "wss://api.poloniex.com",
        currencyPairs = self._app.config.get('Symbols:Poloniex:CurrencyPairs'),
        time = self._app.log.time(),
        connection = new autobahn.Connection({
            url: wsuri,
            realm: "realm1"
        });
    
    self._app.log.info('exchanges/poloniex', 'Poloniex.prototype._connect', wsuri, 'connecting');
    
    connection.onopen = function (session) {
        
        time('exchanges/poloniex', 'Poloniex.prototype._connect', wsuri, 'connected');
        
        if (currencyPairs !== undefined && currencyPairs.length > 0) {
            async.each(currencyPairs, function (currencyPair, callback) {
                session.subscribe(currencyPair[0] + '_' + currencyPair[1], function (args, kwargs) {
                    args.currencyPair = currencyPair;
                    self.emit('orderbook', args);
                });
                callback();
            });
        }
        
        /*
        session.subscribe('ticker', function (args, kwargs) {
            self.emit('ticker', args);
        });
        
        session.subscribe('trollbox', function (args, kwargs) {
            self.emit('trollbox', args);
        });
        */
    };
                    
    connection.open();
};

module.exports.Poloniex = Poloniex;