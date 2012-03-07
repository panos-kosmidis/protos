
/* Dot  */

var dot = require('dot'),
    util = require('util');

// https://github.com/olado/doT

function Dot(app) {
  this.app = app;
  this.module = dot;
  this.multiPart = true;
  this.extensions = ['dot', 'dot.html'];
  this.withContext = true;
  
  // Override dot.templateSettings
  dot.templateSettings.varname = 'locals';
  dot.templateSettings.strip = false;
  dot.templateSettings.append = false;
  
  // Apply filters to dot settings
  app.applyFilter('dot_options', dot.templateSettings);
}

util.inherits(Dot, corejs.lib.engine);

Dot.prototype.render = function(data) {
  data = this.app.applyFilter('dot_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = dot.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Dot;
