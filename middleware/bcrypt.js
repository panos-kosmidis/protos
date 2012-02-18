
var app = corejs.app,
    bcrypt = require('bcrypt');
    
var config;
    
function Blowfish(cfg, middleware) {
  
  app[middleware] = this;
  
  // Middleware configuration
  this.config = config = corejs.extend({
    rounds: 10,
    seedLength: 20
  }, cfg);
  
}

/**
  Hashes a password
  
  @param {string} password
  @param {function} callback
  @public
 */

Blowfish.prototype.hashPassword = function(password, callback) {
  var self = this;
  bcrypt.genSalt(config.rounds, config.seedLength, function(err, salt) {
    if (err) callback.call(self, err, null);
    else {
      bcrypt.hash(password, salt, function(err, pass) {
        if (err) callback.call(self, err, null);
        else callback.call(self, null, pass);
      });
    }
  });
}

/**
  Compares a password against a hash, and returns its validity (boolean).
  
  @param {string} password
  @param {string} hash
  @param {function} callback
  @public
 */

Blowfish.prototype.checkPassword = function(password, hash, callback) {
  var self = this;
  bcrypt.compare(password, hash, function(err, pass) {
    if (err) callback.call(self, err, null);
    else callback.call(self, null, pass);
  });
}

module.exports = Blowfish;