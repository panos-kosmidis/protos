
/* Response enhancements */

var http = require('http'),
    util = require('util'),
    inflect = protos.inflect,
    IncomingMessage = http.IncomingMessage;

/**
  Prevents the route from running. If this function is used, 
  the response needs to be sent manually

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
  // Interface method: verridden dynamically. Do nothing by default.
}

/**
  Sets the page title
  
  @param {string} title
  @public
 */

IncomingMessage.prototype.setPageTitle = function(title) {
  this.__pageTitle = util.format('%s &raquo; %s', this.app.config.title, inflect.capitalize(title));
}

/**
  Gets the page title
  
  @param {string} title
  @returns {string} Page title
  @public
 */

IncomingMessage.prototype.pageTitle = function() {
  return this.__pageTitle || this.app.config.title;
}