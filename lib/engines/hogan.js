
/* Hogan */

var hogan = require('hogan.js'),
    util = require('util');
    
// https://github.com/twitter/hogan.js

function Hogan(app) {
  this.app = app;
  this.module = hogan;
  this.multiPart = true;
  this.extensions = ['hogan', 'hogan.html', 'hg.html'];
}

util.inherits(Hogan, framework.lib.engine);

Hogan.prototype.render = function(data, vars) {
  data = this.app.applyFilters('hogan_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    tpl = hogan.compile(data);
    func = function(data, partials) { 
      return tpl.render(data, partials); 
    }
    func.tpl = tpl;
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments, true);
}

module.exports = Hogan;
