
/* Jade */

var jade = corejs.require('jade', true),
    util = require('util'),
    _ = require('underscore');

// https://github.com/visionmedia/jade

function Jade(app) {
  this.app = app;
  this.options = {
    pretty: true
  }
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
        options = _.extend({filename: filename}, this.options);
    func = jade.compile(data, options);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Jade;
