/*jshint immed: false */

function PrivateController() {
  
  this.authRequired = true;
  
  /* Dynamic routes, covering all route methods */
  
  var routeMethods = this.prototype.routeMethods;
  
  for (var key, i=0; i < routeMethods.length; i++) {
    key = routeMethods[i];
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