
/* http.IncomingMessage */

var _ = require('underscore'),
    http = require('http'),
    util = require('util'),
    formidable = require('formidable'),
    FileManager = framework.lib.filemgr,
    IncomingMessage = http.IncomingMessage;

IncomingMessage.prototype.__saveSession = null;

/**
  Checks if cookie exists

  @param {string} cookie
  @return {boolean}
  @public
 */

IncomingMessage.prototype.hasCookie = function(cookie) {
  if (this.__cookies == null) this.app.loadCookies(this);
  return this.__cookies[cookie.toLowerCase()] != null;
}

/**
  Gets a cookie value

  @param {string} cookie
  @returns {string}
  @public
 */

IncomingMessage.prototype.getCookie = function(cookie) {
  if (this.__cookies == null) this.app.loadCookies(this);
  return this.__cookies[cookie.toLowerCase()];
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

IncomingMessage.prototype.removeCookies = function(cookies) {
  return this.response.removeCookies(cookies);
}

/**
  Gets POST data & files

  @param {function} callback
  @private
 */

IncomingMessage.prototype.getPostData = function(callback) {
  var req = this,
      res = this.response,
      app = this.app,
      form;

  if (req.headers['content-type'] != null) {
    form = req.__incomingForm = new formidable.IncomingForm();
    form.uploadDir = (app.path + '/') + app.paths.upload.replace(app.regex.startOrEndSlash, '') + "/";
    form.maxFieldsSize = app.config.server.maxFieldSize;
    form.encoding = 'utf-8';
    form.keepExtensions = app.config.server.keepUploadExtensions;
    form.parse(req, function(err, fields, files) {
      if (err) {
        app.serverError(res, err);
      } else {
        if ( fields.ajax != null && parseInt(fields.ajax, 10) === 1 ) req.__isAjax = true;
        delete fields.ajax;
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
      uploadSize = app.config.server.maxUploadSize;
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

/**
  Prevents the route from running.

  If this function is used, the response needs to be sent manually

  @private
 */

IncomingMessage.prototype.stopRoute = function() {
  this.__stopRoute = true;
}