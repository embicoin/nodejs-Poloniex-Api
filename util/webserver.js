/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var express = require('express'),
    path = require('path'),
    socketio = require('socket.io');

function Webserver(app) {
    
    var self = this,
        eapp,
        io;
    
    self._app = app;
    
    try {
        eapp = express();
        eapp.use(express.static(path.join(__dirname, '..', 'www')));
        eapp.get('/', function (req, res) { res.sendfile(path.join(__dirname, '..', 'www', 'index.html')); });
        
        self._io = socketio.listen(eapp.listen(self._app.config.get('Web:Port')));
        self._io.sockets.on('connection', function (socket) {
            
            socket.emit('init', {
                balance: {
                    BTC: { available: self._app.stores.Poloniex.BTC.available, onorders: self._app.stores.Poloniex.BTC.onorders, btcvalue: self._app.stores.Poloniex.BTC.btcvalue },
                    XMR: { available: self._app.stores.Poloniex.XMR.available, onorders: self._app.stores.Poloniex.XMR.onorders, btcvalue: self._app.stores.Poloniex.XMR.btcvalue }
                },
                orders: self._app.stores.Poloniex.BTC.XMR.orders,
                trades: self._app.stores.Poloniex.BTC.XMR.trades,
                orderbook: self._app.stores.Poloniex.BTC.XMR.orderbook.orderbook.orderbook,
                ticker: self._app.stores.Poloniex.BTC.XMR.ticker.history
                 
            });
        });
/*
        self._app.stores.on('balance', function (args) {
            self._io.sockets.emit('balance', args);
        });
        
        self._app.stores.on('BTC_XMR', function (args) {
            self._io.sockets.emit('BTC_XMR', args);
        });
*/
        self._app.log.info('util/webserver', 'WebServer', 'started');
        
    } catch (e) {
        self._app.log.error('util/webserver', 'WebServer', e);
    }
}

module.exports.Webserver = Webserver;