
/* Hogan */

var hogan = require('hogan.js'),
    util = require('util');
    
// https://github.com/twitter/hogan.js

var partials = {};

function Hogan(app) {
  this.app = app;
  this.module = hogan;
  this.multiPart = true;
  this.extensions = ['hogan', 'hogan.html', 'hg.html'];
  
  app.on('init', function() {
    Object.keys(app.views.partials).map(function(p) {
      var func = app.views.partials[p];
      if (func.tpl) partials[p] = func.tpl;
      else {
        // Compile a new partial. Using Math.random() to simulate 
        // Unique template content, which generates unique templates.
        var seed = Math.random();
        var tpl = hogan.compile(seed);
        
        // Delete the partial from seed (improves performance)
        delete hogan.cache[seed + '||false'];
        
        // Override the `ri` method. This is what makes the other
        // rendering engines available as partials within hogan
        tpl.ri = function(locals) {
          return func(locals[0]);
        }
        
        partials[p] = tpl;
      }
    });
  });
  
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

Hogan.prototype.returnPartials = function() {
  return partials;
}

module.exports = Hogan;
