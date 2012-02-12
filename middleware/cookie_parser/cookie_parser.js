
var app = corejs.app;

require('./request.js');
require('./response.js');

function CookieParser(config, middleware) {
   
  app.cookieParser = this; // Attach instance to app singleton
  
}

/**
  Parses the cookie header

  @param {string} str
  @returns {object}
  @private
 */

CookieParser.prototype.parseCookie = function(str) {
  var obj = {},
    pairs = str.split(/[;,] */);

  for (var pair,eqlIndex,key,val,i=0; i < pairs.length; i++) {
    pair = pairs[i];
    eqlIndex = pair.indexOf('=');
    key = pair.substr(0, eqlIndex).trim().toLowerCase();
    val = pair.substr(++eqlIndex, pair.length).trim();
    if ('"' === val[0]) val = val.slice(1, -1);
    if (obj[key] === undefined) {
      val = val.replace(/\+/g, ' ');
      try {
        obj[key] = decodeURIComponent(val);
      } catch (err) {
        if (err instanceof URIError) {
          obj[key] = val;
        } else {
          throw err;
        }
      }
    }
  }
  return obj;
}

/**
  Parses the request cookies

  @param {object} req
  @returns {object}
  @private
 */

CookieParser.prototype.getRequestCookies = function(req) {
  if (req.headers.cookie != null) {
    try {
      return parseCookie(req.headers.cookie);
    } catch (e) {
      this.log(req.urlData.pathname, "Error parsing cookie header: " + e.toString());
      return {};
    }
  } else {
    return {};
  }
}

module.exports = CookieParser;