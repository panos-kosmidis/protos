
/** 
  Markdown
  
  Provides markdown support for applications & views.
  
  The concept of "flag aliases" is introduced, as a mechanism to store a group
  of discount flags for specific types of content. This allows fine grained parsing
  of markdown syntax where different requirements are needed.
  
  The markdown syntax is automatically sanitized, if the flag alias specified has been
  configured to be sanitized. In other words, if it's present in the `sanitize` 
  configuration array.
  
  » References:
  
    http://www.pell.portland.or.us/~orc/Code/discount/
    https://github.com/visionmedia/node-discount
    https://github.com/theSmaw/Caja-HTML-Sanitizer
    http://code.google.com/p/google-caja/source/browse/trunk/src/com/google/caja/plugin/html-sanitizer.js

  » Configuration options:

    {object} flags: containing flag aliases to set
    {array} sanitize: containing the flag aliases to sanitize
    
  » View Helpers:
  
    $markdown: Parses a markdown string. Alias of `Markdown::parse`
    
  » Example:
  
    app.use('markdown', {
      flags: {
        content: ['noImage', 'noPants', 'autolink'],
        comment: ['noHTML', 'noTables', 'strict']
      },
      sanitize: ['default', 'comments']
    });
    
  » Usage example (liquor rendering engine):
  
    #{$markdown('## This is a **heading** level 2')}
    
    #{$markdown('This is comment text', 'comment')}

 */

var app = corejs.app,
    util = require('util'),
    discount = require('discount'),
    sanitizer = require('sanitizer'),
    isArray = util.isArray;

function Markdown(config, middleware) {
  
  // Attach to app singleton
  app[middleware] = this;
  
  // Configuration defaults
  config = corejs.extend({
    sanitize: ['default']
  }, config);
  
  // Default Flags
  this.flags = {
    default: ['autolink', 'extraFootnote']
  };
  
  // Sanitize
  this.sanitize = config.sanitize;
  
  // Parse default flag bits
  this.setFlags(this.flags);
  
  // Config flags
  if (config.flags && typeof config.flags == 'object') this.setFlags(config.flags);
  
  // Define config property
  Object.defineProperty(this, 'config', {
    value: config,
    writable: true,
    enumerable: false,
    configurable: true
  });
  
  // Register Markdown view helpers
  registerViewHelpers(this);
  
}

/**
  Parse a markdown string
  
  @param {string} str Markdown syntax to parse
  @param {int|string|array} Discount flags or alias
  @return {string} html
  @public
 */

Markdown.prototype.parse = function(str, flag) {
  var bits; // Flag bits
  
  flag = (flag || 'default');
  
  if (flag in this.flags) {
    // Flag alias
    bits = this.flags[flag]
  } else if (flag in discount.flags) {
    // Discount flag
    bits = discount.flags[flag];
  } else if (isArray(flag)) {
    // Array » count flags
    bits = this.flagCounter(flag);
  } else if (typeof flag == 'number') {
    // Number
    bits = flag;
  }
  
  // See if buffer needs to be sanitized
  if (this.sanitize.indexOf(flag) >= 0) {
    str = sanitizer.sanitize(str);
  }
  
  return discount.parse(str, bits);
}

/**
  Sets markdown flags to an alias
  
  @param {string} alias
  @param {int|string|array}
 */

Markdown.prototype.setFlags = function(o) {
  var key, flag;
  for (key in o) {
    flag = parseFlag(o[key]);
    this.flags[key] = flagCounter(flag);
  }
}
 
/**
  Counts discount flag bits
  
  @param {array} flag List of flags
  @returns {int} flag bits
  @private
 */

function flagCounter(flags) {
  var flag, i, sum=0;
  for (i=0; i < flags.length; i++) {
    flag = flags[i];
    if (flag in discount.flags) {
      sum += discount.flags[flag];
    } else {
      throw new Error(util.format("Not a discount flag: '%s'", flag));
    }
  }
  return sum;
}

/**
  Returns a valid flag representation
  
  @param {int|string|array} flag  Count, Flag name or Array of flags
  @return {mixed} flag
  @private
 */ 

function parseFlag(flag) {
  if (typeof flag == 'number' || isArray(flag)) {
    return flag;
  } else if (typeof flag == 'string') {
    return [flag];
  } else {
    throw new Error("Invalid flag data: " + flag);
  }
}

/**
  Registers View Helpers
  
  @param {object} instance Markdown middleware instance
  @private
 */

function registerViewHelpers(markdown) {
  
  // Expose markdown.parse as `$markdown`
  app.registerViewHelper('$markdown', markdown.parse, markdown);
  
}

module.exports = Markdown;
