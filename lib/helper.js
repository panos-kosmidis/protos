
/* Helper */

var app,
    util = require('util');

function Helper() {
  app = corejs.app;
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

Helper.prototype.link = function(o, d) {
  var text = o.text || '',
      href = o.href || '#';
  return text.link(href);
}

module.exports = Helper;
