
/* Body Parser » Request ennhancements */

var formidable = require('formidable'),
    IncomingForm = formidable.IncomingForm;

/**
  Gets POST data & files

  @param {function} callback
  @private
 */

IncomingMessage.prototype.parseBodyData = function(callback) {
  var req = this,
      res = this.response,
      app = this.app,
      form;

  if (req.headers['content-type'] != null) {
    form = req.__incomingForm = new IncomingForm();
    form.uploadDir = (app.path + '/') + app.paths.upload.replace(app.regex.startOrEndSlash, '') + "/";
    form.maxFieldsSize = app.config.uploads.maxFieldSize;
    form.encoding = 'utf-8';
    form.keepExtensions = app.config.uploads.keepUploadExtensions;
    form.parse(req, function(err, fields, files) {
      if (err) {
        app.serverError(res, err);
      } else {
        callback.call(req, fields, new FileManager(app, files));
      }
    });
  } else {
    callback.call(req, {}, {});
  }
}

/**
  Checks if the upload limit has exceeded

  @returns {boolean}
  @private
 */

IncomingMessage.prototype.exceededUploadLimit = function() {
  var app = this.app,
      res = this.response;
  if (this.headers['content-length'] != null) {
    var bytesExpected = parseInt(this.headers['content-length'], 10),
      uploadSize = app.config.uploads.maxUploadSize;
    if (bytesExpected > uploadSize) {
      app.emit('upload_limit_exceeded', this, res);
      if (this.__stopRoute === true) return true;
      res.setHeaders({ Connection: 'close' });
      res.rawHttpMessage({
        statusCode: 400,
        message: "Upload limit exceeded: " + (uploadSize / (1024 * 1024)) + " MB",
        raw: true
      });
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}