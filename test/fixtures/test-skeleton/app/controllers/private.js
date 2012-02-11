/*jshint immed: false */

function PrivateController() {
  
  this.authRequired = true;
  
  /* Dynamic routes, covering all route methods */
  
  for (var key in this) {
    if (key != 'super_' && this.hasOwnProperty(key) && this[key] instanceof Function) {
      (function(k) {
        this[k]('/'+ k, function(req, res) {
          res.sendHeaders();
          res.end('{'+ k +'}\n\n');
        });
      }).call(this, key);
    }
  }
  
}

module.exports = PrivateController;