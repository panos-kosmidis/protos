
/* Cookie Parser » Request extensions */

var app = corejs.app,
    http = require('http'),
    IncomingMessage = http.IncomingMessage;
    
/**
  Checks if cookie exists

  @param {string} cookie
  @return {boolean}
  @public
 */

IncomingMessage.prototype.hasCookie = function(cookie) {
  if (this.cookies == null) app.loadCookies(this);
  return this.cookies[cookie.toLowerCase()] != null;
}

/**
  Gets a cookie value

  @param {string} cookie
  @returns {string}
  @public
 */

IncomingMessage.prototype.getCookie = function(cookie) {
  if (this.cookies == null) app.loadCookies(this);
  return this.cookies[cookie.toLowerCase()];
}

/**
  Removes a cookie

  @param {string} cookie
  @public
 */

IncomingMessage.prototype.removeCookie = function(cookie) {
  return this.response.removeCookie(cookie);
}

/**
  Removes several cookies

  @param {array} cookies
  @public
 */

IncomingMessage.prototype.removeCookies = function() {
  return this.response.removeCookies.apply(this.response, arguments);
}