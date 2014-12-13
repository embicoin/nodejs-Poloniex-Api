/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var config = require('./util/config'),
    log = require('./util/log'),
    store = require('./util/store/stores'),
    poloniex = require('./exchanges/poloniex'),
    async = require('async'),
    webserver = require('./util/webserver'),
    blessed = require('blessed'),
    trader = require('./trader/bouncer'),
    windows = require('./win/windows'),
    program = blessed.program();

function App() {
    var self = this;

    self.program = program;
    self.config = new config.Configuration(self, 'config.json');
    self.log = new log.Logger(self);
    self.exchanges = {
        'Poloniex': new poloniex.Poloniex(self)
    };
    self.stores = new store.Stores(self);
    self.webserver = new webserver.Webserver(self);
}

App.prototype.quit = function () {
    var self = this;
    self.trader.stop();
    self.exchanges.Poloniex.cancel_orders(['BTC', 'XMR'], function () {
        self.exchanges.Poloniex.cancel_orders(['BTC', 'XMR'], function () {
            process.exit();
        });
    });
};

App.prototype.main = function () {
    var self = this;
    
    self._windows = new windows.Windows(self);
    
    self.exchanges.Poloniex.cancel_orders(['BTC', 'XMR'], function () {
        self.trader = new trader.Bouncer(self);
    });
  
    self.log.info('app', 'App.prototype.main', self.config.get('DEBUG') ? 'DEBUG' : 'LIVE');
};

var app = new App();
app.main();