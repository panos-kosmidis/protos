
/* Helper */

var util = require('util'),
    sanitizer = require('sanitizer');

function Helper() {

}

/**
  Sanitizes input
  
  @param {string} text
  @returns {string} sanitized string
  @public
 */
 
Helper.prototype.sanitize = function(str) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return sanitizer.sanitize(str);
}

/**
  Escapes input
  
  @param {string} text
  @returns {string} escaped string
  @public
 */
 
Helper.prototype.escape = function(str) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return sanitizer.escape(str);
}

/**
  Returns a safe string: Sanitized + Escaped
  
  @param {string} text
  @returns {string} escaped string
  @public
  */
  
Helper.prototype.safe_str = function(str) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return sanitizer.escape(sanitizer.sanitize(str));
}


module.exports = Helper;
