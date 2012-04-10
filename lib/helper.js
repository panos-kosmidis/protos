
/**
  @module lib
*/

var util = require('util'),
    sanitizer = require('sanitizer');

/**
  Helper class. The methods provided by this class are available within views, prefixed with `$`.
  
  For example, you can access the methods as `$sanitize`, `$escape`, etc.
  
  Additionally, any methods added to `MainHelper` will behave as if they were defined in the `Helper` class.
  
  @class Helper
  @constructor
 */

function Helper() {

}

/**
  Sanitizes input
  
  @method sanitize
  @param {string} text
  @return {string} sanitized string
 */
 
Helper.prototype.sanitize = function(str) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return sanitizer.sanitize(str);
}

/**
  Escapes input
  
  @method escape
  @param {string} text
  @return {string} escaped string
 */
 
Helper.prototype.escape = function(str) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return sanitizer.escape(str);
}

/**
  Returns a safe string: Sanitized + Escaped
  
  @method safe_str
  @param {string} text
  @return {string} escaped string
  */
  
Helper.prototype.safe_str = function(str) {
  str = (str.text || str) + ''; // Accept both objects and strings
  return sanitizer.escape(sanitizer.sanitize(str));
}


module.exports = Helper;
