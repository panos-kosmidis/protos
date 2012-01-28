
/* Dot  */

var dot = framework.extend({}, require('dot')), // Work with a copy of the module
    util = require('util');

// https://github.com/olado/doT

function Dot(app) {
  this.app = app;
  this.module = dot;
  
  // Override dot.templateSettings
  dot.templateSettings.varname = 'locals';
  dot.templateSettings.strip = false;
  dot.templateSettings.append = false;
  
  // Apply filters to dot settings
  app.applyFilters('dot_options', dot.templateSettings);
  
  this.multiPart = true;
  this.extensions = ['dot', 'dot.html'];
}

util.inherits(Dot, framework.lib.engine);

Dot.prototype.render = function(data) {
  data = this.app.applyFilters('dot_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = dot.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Dot;
