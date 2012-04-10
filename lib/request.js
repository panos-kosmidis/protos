
/**
  @module lib
 */
 
/**
  @private
  @class IncomingMessage
  @constructor
 */

var http = require('http'),
    util = require('util'),
    inflect = protos.inflect,
    IncomingMessage = http.IncomingMessage;


/**
  Stops the controller from performing any subsequent route resolutions. If this function
  is used, a response **must** be sent manually.

  @method stopRoute
 */

IncomingMessage.prototype.stopRoute = function() {
  this.__stopRoute = true;
}

/**
  Runs the next route function in chain. This is a stub method, and is overridden when multiple
  route functions are specified for one route.
  
  @method next
 */
 
IncomingMessage.prototype.next = function() {
  // Interface method: verridden dynamically. Do nothing by default.
}

/**
  Sets the page title
  
  @method setPageTitle
  @param {string} title
 */

IncomingMessage.prototype.setPageTitle = function(title) {
  this.__pageTitle = util.format('%s &raquo; %s', this.app.config.title, inflect.capitalize(title));
}

/**
  Gets the page title
  
  @method pageTitle
  @param {string} title
  @return {string} Page title (if set). Defaults to app.config.title
 */

IncomingMessage.prototype.pageTitle = function() {
  return this.__pageTitle || this.app.config.title;
}