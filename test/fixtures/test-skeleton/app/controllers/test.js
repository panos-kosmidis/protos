
var util = require('util');

function TestController(app) {

  var self = this;

  for (var key in this) {
    if (key != 'super_' && this.hasOwnProperty(key)) {
      // Dynamically define route
      (function(k, func) {
        this[k]('/'+ k, function(req, res) {
          res.sendHeaders();
          res.end('{'+ k +'}\n\n');
        });
      }).call(this, key);
    }
  }
  
}

module.exports = TestController;