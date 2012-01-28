
/* Coffeekup  */

var _ = require('underscore'),
    ck = require('coffeekup'),
    util = require('util');
    
// https://github.com/mauricemach/coffeekup

function CoffeeKup(app) {
  this.app = app;
  this.options = {
    locals: true,
    hardcode: {}
  };
  this.module = ck;
  this.multiPart = true;
  this.extensions = ['coffeekup', 'ck.html'];
}

util.inherits(CoffeeKup, framework.lib.engine);

CoffeeKup.prototype.render = function(data) {
  // CoffeeKup requires some reserved variables which need
  // to exist in the locals object. These are only if not present.
  if (data.format == null) data.format = true;
  if (data.autoescape == null) data.autoescape == false;
  
  // Apply filters to data
  data = this.app.applyFilters('coffeekup_template', data);
  
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    // data.locals already set
    func = ck.compile(data, this.options);
    
    // Handle white space
    var ws = this.getBoundaryWhitespace(data);
    
    console.exit(ws);
    
    this.cacheFunction(func, arguments);
  }
  
  return this.evaluate(func, arguments);
}

module.exports = CoffeeKup;
