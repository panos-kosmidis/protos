
/* Handlebars */

var handlebars = require('handlebars'),
    util = require('util');
    
var appPartials; // Cache partials reference within closure

// https://github.com/wycats/handlebars.js

function Handlebars(app) {
  this.app = app;
  this.module = handlebars;
  this.multiPart = true;
  this.extensions = ['handlebars', 'handlebars.html', 'hb.html'];
  appPartials = app.views.partials; // Set partials reference
}

util.inherits(Handlebars, framework.lib.engine);

Handlebars.prototype.render = function(data) {
  data = this.app.applyFilters('handlebars_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    func = handlebars.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments, true);
}

Handlebars.prototype.registerHelper = function(alias, callback) {
  handlebars.registerHelper(alias, callback);
}

Handlebars.prototype.returnPartials = function() {
  return {partials: appPartials}; // Use cached partials reference
}

module.exports = Handlebars;
