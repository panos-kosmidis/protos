
/* Jade */

var jade = require('jade'),
    util = require('util'),
    extend = corejs.extend;

// https://github.com/visionmedia/jade

function Jade(app) {
  this.app = app;
  
  var opts = (app.config.engines && app.config.engines.jade) || {};
  
  this.options = corejs.extend({
    pretty: true
  }, opts);
  
  this.module = jade;
  this.multiPart = false;
  this.extensions = ['jade', 'jade.html']
}

util.inherits(Jade, corejs.lib.engine);

Jade.prototype.render = function(data, vars, relPath) {
  data = this.app.applyFilters('jade_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    var filename = this.app.fullPath(this.app.mvcpath + 'views/' + relPath),
        options = extend({filename: filename}, this.options);
    func = jade.compile(data, options);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Jade;
