
/* JsHtml  */

var j = require('jshtml'),
    util = require('util');

// https://github.com/LuvDaSun/jshtml

function JsHtml(app) {
  this.app = app;
  this.module = j;
  
  var opts = (app.config.engines && app.config.engines.jshtml) || {};

  this.options = protos.extend({with: false}, opts);
  
  this.multiPart = true;
  this.extensions = ['jshtml'];
}

util.inherits(JsHtml, protos.lib.engine);

JsHtml.prototype.render = function(data) {
  data = this.app.applyFilters('jshtml_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = j.compile(data, this.options);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = JsHtml;
