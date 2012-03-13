
/* Response enhancements */

var http = require('http'),
    IncomingMessage = http.IncomingMessage;

/**
  Prevents the route from running.

  If this function is used, the response needs to be sent manually

  @private
 */

IncomingMessage.prototype.stopRoute = function() {
  this.__stopRoute = true;
}

/**
  Runs the next route function in chain. This is a stub method, and is overridden when multiple
  route functions are specified for one route.
  @public
 */
 
IncomingMessage.prototype.next = function() {
  
}