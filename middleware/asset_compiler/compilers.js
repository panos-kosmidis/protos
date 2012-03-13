
/* Asset compilers */

var less = require('less'),
    stylus = require('stylus'),
    coffee = require('coffee-script');
    
// Asset compilers
module.exports = {
  
  less: function(source, callback) {
    less.render(source, callback);
  },
  
  styl: function(source, callback) {
    stylus.render(source, {}, callback);
  },
  
  coffee: function(source, callback) {
    callback(null, coffee.compile(source));
  }
  
}