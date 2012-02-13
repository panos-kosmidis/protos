
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