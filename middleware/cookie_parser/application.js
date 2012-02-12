
/* Cookie Parser » Application extensions */

var app = corejs.app,
    Application = corejs.lib.application;
    
/**
  Loads request cookies

  @param {object} req
  @return {object}
  @private
 */

Application.prototype.loadCookies = function(req) {
  if (req.__cookies != null) return;
  return req.__cookies = getRequestCookies(req);
}