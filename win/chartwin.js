/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
/*jslint continue: true */
'use strict';

var util = require('util'),
    win = require('./win'),
    blessed = require('blessed'),
    strftime = require('strftime'),
    clc = require('cli-color');

function ChartWin(windows) {
    var self = this;

    win.Win.call(this, windows, {
        top: 6,
        bottom: 0,
        left: 0,
        right: 27,
        style: { bg: '#191919' }
    },
        'c',
        '(C)hart');

    self._width = self._box.width;
    self._height = self._box.height;
    self._maxx = (self._width - 23) / 4;
    
    self._windows._app.stores.on('BTC_XMR', function (data) {
        if (data.type === 'orderbook') {
            self._build();
        }
    });
}
util.inherits(ChartWin, win.Win);

ChartWin.prototype.onshow = function () {
    var self = this;
    
    self._build();
};

ChartWin.prototype._x = function (h) {
    var self = this,
        cwidth = self._width - 23,
        wph = 4,
        r = parseInt(cwidth - (h * wph), 10);
    
    if (h > self._maxx || h < 0 || r > cwidth) {
        return -1;
    }
    
    return r;
};

ChartWin.prototype._setColor = function (c, x, y, len, fn) {
    var self = this;
    
    if (self._colors === undefined) {
        self._colors = [];
    }

    if (x < 0 || len < 1) {
        return;
    }
    
    self._colors.push({x: x, y: y, len: len, fn: fn});
};

ChartWin.prototype._renderColors = function (content) {
    var self = this,
        i,
        c,
        val;
    
    self._colors.sort(function (a, b) { return a.x < b.x; });

    for (i = 0; i < self._colors.length; i++) {
        c = self._colors[i];
        
        if (c.x < 0) {
            continue;
        }
    
        if (content[c.y] === undefined) {
            content[c.y] = '';
        }

        while (content[c.y].length < c.x + c.len) {
            content[c.y] += ' ';
        }
        
        val = content[c.y].substr(c.x, c.len);
        
        content[c.y] = content[c.y].substr(0, c.x)
            + c.fn(val)
            + content[c.y].substr(c.x + c.len);
    }

    self._colors = undefined;
};

ChartWin.prototype._set = function (c, x, y, val, fill, setlen) {
    var i;
    
    if (x < 0) {
        return;
    }
    
    if (c[y] === undefined) {
        c[y] = '';
    }
    
    if (fill === undefined) {
        fill = ' ';
    }
    
    if (setlen === undefined) {
        setlen = val.length;
    }
    
    if (c[y].length > x) {
        while ((c[y].length + val.length) < x) {
            c[y] += fill;
        }
        c[y] = c[y].substr(0, x) + val + c[y].substr(x + setlen);
    } else {
        while (c[y].length < x) {
            c[y] += fill;
        }
        c[y] += val;
    }
};

ChartWin.prototype._y = function (c, vols) {
    var self = this,
        i,
        p,
        f = true,
        store = self._windows._app.stores.Poloniex.BTC.XMR,
        last = parseFloat(store.ticker.history[store.ticker.history.length - 1].last),
        d;
    
    for (i = 0; i < self._height - 1; i++) {
        if (i !== self._height - 15) {
            self._set(c, self._x(0) + 2, i, '│');
        }
        
        if (i > self._height - 15) {
            p = i - (self._height - 15) + 1;
            if (f) {
                self._set(c, self._x(0) + 4, i + 1, (vols.max / 13 * p * last).toFixed(0) + 'BTC');
            }
            
            f = !f;
            if (i > self._height) {
                f = false;
            }
        }
    }

    i = 0;
    for (p in vols.volumes) {
        if (vols.volumes.hasOwnProperty(p)) {
            if (vols.volumes[p] === undefined) {
                continue;
            }
            
            for (i = (self._height - 15); i <= parseInt((self._height - 15) + ((13 / vols.max) * vols.volumes[p]), 10); i++) {
                self._set(c,
                          self._x(p / 4) + 3,
                          i + 1,
                          i === (self._height - 15) ? '┳' : '┃');
            }

        }
    }
};

ChartWin.prototype._xAxis = function (c) {
    var self = this,
        i;
    
    self._set(c, self._x(0) - 2, self._height - 15, ' 0h ┤', '─');

    for (i = 5; i < self._maxx; i += 5) {
        self._set(c, self._x(i) - 3, self._height - 15, ' ' + i + 'h ', '─');
    }

};

ChartWin.prototype._tradeVolume = function (c) {
    var self = this,
        i,
        h,
        gkey,
        vols = {},
        max = 0,
        len;
      
    for (i = 0; i < self._windows._app.stores.Poloniex.BTC.XMR.ticker.history.length; i++) {
        h = self._windows._app.stores.Poloniex.BTC.XMR.ticker.history[i];
        
        gkey = parseInt((Date.now() - h.date) / (1000 * 60 * 15), 10);
        
        if (gkey / 4 > self._maxx) {
            continue;
        }
        
        if (vols[gkey] === undefined) {
            vols[gkey] = 0;
        }
        vols[gkey] += parseFloat(h.amount);
        
        if (vols[gkey] > max) {
            max = vols[gkey];
        }
    }
    
    return { max: max, volumes: vols };
};

ChartWin.prototype._trades = function (c) {
    var self = this,
        i,
        ii,
        p,
        v,
        o,
        vb,
        vs,
        min,
        max,
        store = self._windows._app.stores.Poloniex.BTC.XMR,
        last = parseFloat(store.ticker.history[store.ticker.history.length - 1].last),
        item,
        diff,
        cheight = self._height - 15,
        step,
        ph,
        pl,
        fn,
        len,
        isask,
        s,
        f,
        buys,
        sells,
        ov,
        h,
        gkey;
    
    for (i = 0; i < store.orders.length; i++) {
        item = store.orders[i];

        if (min === undefined || min > parseFloat(item.rate)) {
            min = parseFloat(item.rate) * 0.99;
        }
        if (max === undefined || max < parseFloat(item.rate)) {
            max = parseFloat(item.rate) * 1.01;
        }
    }
    
    diff = max - min;
    step = diff / cheight;
    
    for (i = 0; i < cheight; i += 2) {
        
        p = ((cheight - i) * step + min);
        self._set(c,
                  self._x(0) + 4,
                  i,
                  p.toFixed(6));

    }
    
    for (i = 0; i < store.orders.length; i++) {
        item = store.orders[i];
        fn = clc.bgRed.white.bold;
        
        if (item.type === 'buy') {
            fn = clc.bgGreen.white.bold;
        }
        
        p = parseFloat(item.rate) - min;
        p = p / step;

        self._setColor(c, self._x(0) + 2, Math.floor(cheight - p), 11, fn);
    }
    
    try {
        
        buys = [];
        sells = [];
        
        for (i = 0; i < store.orderbook.orderbook.orderbook.asks.length; i++) {
            if (i === 0) {
                sells.push([
                    parseFloat(store.orderbook.orderbook.orderbook.asks[i][0]),
                    parseFloat(store.orderbook.orderbook.orderbook.asks[i][1])
                ]);
            } else {
                sells.push([
                    parseFloat(store.orderbook.orderbook.orderbook.asks[i][0]),
                    parseFloat(store.orderbook.orderbook.orderbook.asks[i][1])
                        + sells[sells.length - 1][1]
                ]);
            }
        }
        
        for (i = 0; i < store.orderbook.orderbook.orderbook.bids.length; i++) {
            if (i === 0) {
                buys.push([
                    parseFloat(store.orderbook.orderbook.orderbook.bids[i][0]),
                    parseFloat(store.orderbook.orderbook.orderbook.bids[i][1])
                ]);
            } else {
                buys.push([
                    parseFloat(store.orderbook.orderbook.orderbook.bids[i][0]),
                    parseFloat(store.orderbook.orderbook.orderbook.bids[i][1])
                        + buys[buys.length - 1][1]
                ]);
            }
        }
        
        for (i = 1; i < cheight; i++) {

            pl = (i * step + min);
            ph = pl + step;
            v = 0;
            f = false;
            
            for (ii = 0; ii < sells.length; ii++) {
                o = sells[ii];

                if (o[0] > pl && o[0] < ph) {
                    v += parseFloat(o[1]);
                    f = true;
                    break;
                }
            }
    
            for (ii = 0; ii < buys.length; ii++) {
                o = buys[ii];

                if (o[0] > pl && o[0] < ph) {
                    v += parseFloat(o[1]);
                    f = true;
                    break;
                }
            }
            
            len = Math.abs(v * last * 2);
            len = Math.abs(len / 4) * 4;
            v = Math.floor(v * last).toString();
            
            if (v <= 0) {
                continue;
            }
            
            if ((i === 1 || i === cheight - 1) && v > 1) {
                self._set(c,
                          self._x(len / 4) - (v.length - 2),
                          cheight - i,
                          v + ' BTC');
            }
            

            self._setColor(c,
                           self._x(len / 4) + 3,
                           cheight - i,
                           len,
                           clc.bgWhite.black);
        }

    } catch (e) {
        self._windows._app.log.error('win/chartwin', '_trades', e);
    }
    
    try {

        for (i = 0; i < store.ticker.history.length; i++) {
            h = store.ticker.history[i];
            
            gkey = Math.floor((Date.now() - h.date) / (1000 * 60 * 15));

            p = parseFloat(h.last) - min;
            p = p / step;
            
            self._set(c,
                  self._x(gkey / 4),
                  Math.floor(cheight - p),
                  '•');

        }
        
    } catch (ex) {
        self._windows._app.log.error('win/chartwin', '_trades', ex);
    }
};

ChartWin.prototype._build = function (data) {
    var self = this,
        lines = [],
        i,
        vols,
        orderbook;
    
    if (self._windows._app.stores.Poloniex.BTC.XMR.orders === undefined) {
        return;
    }
    
    try {

        if (self.isVisible) {
            
            vols = self._tradeVolume(lines);
            
            self._y(lines, vols);
            self._xAxis(lines);

            self._trades(lines);
            
            if (self._colors !== undefined) {
                self._renderColors(lines);
            }

            self.setContent(lines.join('\r\n'));
        }
        
    } catch (e) {
        self._windows._app.log.error('win/chartwin', 'ChartWin.prototype.build', e);
    }
    
    return;
};

module.exports.ChartWin = ChartWin;