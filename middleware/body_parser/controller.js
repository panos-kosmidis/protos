
/* Body Parser » Controller enhancements */

var app = corejs.app,
    Controller = corejs.lib.controller;

/**
  Retrieves POST fields & files, with validation & CSRF protection.

  If the CSRF token is specified, the request will be validated against it. On failure to
  validate, an HTTP/400 response will be sent.

  The request fields will be validated against the route's validation rules.

  The files uploaded are stored by default on /private/incoming.

  @param {object} req
  @param {string} token (optional)
  @param {function} callback
  @public
 */

Controller.prototype.getRequestData = function(req, callback) {
  var fields, files, requestData,
      self = this,
      res = req.response;

  if (req.method == 'POST' || req.method == 'PUT') {
    requestData = req.__requestData;
    fields = requestData.fields;
    files = requestData.files;

    // TODO: CSRF Middleware
    if (app.supports.csrf_protect) {
      console.trace('Validate CSRF Token');
      process.exit();
    } else {
      if (app.validate(req, fields)) {
        callback.call(self, fields, files);
      }
    }

  } else {
    app.badRequest(res);
  }
}