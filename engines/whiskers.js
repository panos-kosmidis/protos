
/* Whiskers */

var whiskers = require('whiskers'),
    util = require('util');

// https://github.com/gsf/whiskers.js/tree

function Whiskers(app) {
  this.app = app;
  this.module = whiskers;
  this.multiPart = true;
  this.extensions = ['whiskers', 'whiskers.html', 'wk.html'];
}

util.inherits(Whiskers, protos.lib.engine);

Whiskers.prototype.render = function(data) {
  data = this.app.applyFilters('whiskers_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    tpl = whiskers.compile(data);
    func = function(locals) {
      return tpl(locals, locals); // context + partials
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Whiskers;
