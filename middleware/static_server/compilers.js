
/* Static Server » Asset compilers */

var less = require('less'),
    sass = require('sass'),
    scss = require('scss'),
    coffee = require('coffee-script');

// Asset compilers
module.exports = {
  
  coffee: function(source, callback) {
    callback(null, coffee.compile(source));
  },
  
  less: function(source, callback) {
    less.render(source, callback);
  },
  
  sass: function(source, callback) {
    callback(null, sass.render(source));
  }
  
}