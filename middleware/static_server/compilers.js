
/* Static Server » Asset compilers */

var coffeeScript = require('coffee-script');

// Asset compilers
module.exports = {
  
  coffee: function(source) {
    return coffeeScript.compile(source);
  }
  
}