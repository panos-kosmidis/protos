
/* JsHtml  */

var j = require('jshtml'),
    util = require('util');

// https://github.com/LuvDaSun/jshtml

function JsHtml(app) {
  this.app = app;
  this.module = j;
  this.options = {with: false};
  this.multiPart = true;
  this.extensions = ['jshtml'];
}

util.inherits(JsHtml, framework.lib.engine);

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
