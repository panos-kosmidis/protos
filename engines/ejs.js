
/* EJS */

var ejs = require('ejs'),
    util = require('util');

// https://github.com/visionmedia/ejs

function EJS(app) {
  this.app = app;
  
  var opts = (app.config.engines && app.config.engines.ejs) || {};
  
  this.options = corejs.extend({open: '<%', close: '%>'}, opts);
  
  this.module = ejs;
  this.multiPart = true;
  this.extensions = ['ejs', 'ejs.html'];
}

util.inherits(EJS, corejs.lib.engine);

EJS.prototype.render = function(data) {
  data = this.app.applyFilters('ejs_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = ejs.compile(data, this.options);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = EJS;
