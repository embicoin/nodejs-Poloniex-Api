/*jslint node: true */
/*jslint nomen: true */
/*jslint plusplus: true */
'use strict';

var util = require('util'),
    async = require('async'),
    blessed = require('blessed');

function Win(windows, opts, key, title) {
    var self = this;
    
    self._windows = windows;
    self.isVisible = false;
    self.hasChanges = false;
    self.key = key;
    self.title = title;
    
    self._box = blessed.box(opts);
    self._windows._screen.append(self._box);
    
    self._box.setContent('Loading...');
}

Win.prototype.show = function () {
    var self = this;
    
    self.isVisible = true;
    self.hasChanges = false;
    
    if (self.onshow !== undefined) {
        self.onshow();
    }
};

Win.prototype.hide = function () {
    var self = this;
    
    self.isVisible = false;
    
    if (self.onhide !== undefined) {
        self.onhide();
    }
};

Win.prototype.setContent = function (content) {
    var self = this;
    
    if (self._content !== content) {
        if (!self.isVisible) {
            self.hasChanges = self._content !== undefined;
        }
        self._content = content;
        
        self._box.setContent(self._content);
        self._windows._screen.render();
    }
};

module.exports.Win = Win;