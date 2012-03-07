
/* Handlebars */

var handlebars = require('handlebars'),
    util = require('util');
    
// https://github.com/wycats/handlebars.js

var partials;

function Handlebars(app) {
  this.app = app;
  this.module = handlebars;
  this.multiPart = true;
  this.extensions = ['handlebars', 'handlebars.html', 'hb.html'];
  partials = {partials: app.views.partials};
}

util.inherits(Handlebars, corejs.lib.engine);

Handlebars.prototype.render = function(data) {
  data = this.app.applyFilter('handlebars_template', data);
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
  return partials;
}

module.exports = Handlebars;
