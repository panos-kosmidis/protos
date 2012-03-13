
/* Helper */

var util = require('util'),
    sanitizer = require('sanitizer');

function Helper() {

}

/**
  Returns the markup for an HTML <link> element
  
  @param {object} o Object containing:
    type: Type for the link element. Defaults to 'text/css'
    href: URL for the linked resource
  @public
 */

Helper.prototype.stylesheet = function(o) {
  var rel = o.rel || 'stylesheet',
      type = o.type || 'text/css',
      href = o.href || '';
  return util.format('<link rel="%s" type="%s" href="%s" />', rel, type, href) ;
}

/**
  Returns the markup for an HTML <script> element
  
  @param {object} o Object containing:
    src: Path or URL to the script resource
  @public
 */

Helper.prototype.script = function(o) {
  var src = o.src || '';
  return util.format('<script type="text/javascript" src="%s"></script>', src); 
}

/**
  Returns the markup for an HTML <a> element
  
  @param {object} o Object containing:
    text: Text for the link
    href: URL for the link
  @public
 */

Helper.prototype.link = function(o) {
  var text = o.text || '',
      href = o.href || '#';
  return text.link(href);
}

/**
  Sanitizes input
  
  @param {string} text
  @returns {string} sanitized string
  @public
 */
 
Helper.prototype.sanitize = function(str) {
  str = (str.text || str); // Accept both objects and strings
  return sanitizer.sanitize(str);
}

/**
  Escapes input
  
  @param {string} text
  @returns {string} escaped string
  @public
 */
 
Helper.prototype.escape = function(str) {
  str = (str.text || str); // Accept both objects and strings
  return sanitizer.escape(str);
}

/**
  Returns a safe string: Sanitized + Escaped
  
  @param {string} text
  @returns {string} escaped string
  @public
  */
  
Helper.prototype.safe_str = function(str) {
  str = (str.text || str); // Accept both objects and strings
  return sanitizer.escape(sanitizer.sanitize(str));
}


module.exports = Helper;
