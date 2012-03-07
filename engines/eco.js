
/* Eco  */

var eco = require('eco'),
    util = require('util');

// https://github.com/sstephenson/eco

function Eco(app) {
  this.app = app;
  this.module = eco;
  this.multiPart = true;
  this.extensions = ['eco', 'eco.html'];
}

util.inherits(Eco, corejs.lib.engine);

Eco.prototype.render = function(data) {
  data = this.app.applyFilters('eco_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = eco.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Eco;
