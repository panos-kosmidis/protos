
var app = corejs.app,
    fs = require('fs'),
    http = require('http'),
    util = require('util');
    
var infoLog = fs.createWriteStream(app.fullPath('log/info.log'), {flags: 'a'}),
    errorLog = fs.createWriteStream(app.fullPath('log/error.log'), {flags: 'a'}),
    accessLog;

function Logger(config, middleware) {
  
  // Attach to app singleton
  app[middleware] = this;
  
  // Define access log data in same closure (faster access)
  var accessLogConsole,
      domain = app.domain,
      appDate = app.date;
  
  // Middleware config
  this.config = config = corejs.extend({
    accessLog: true,
    accessLogConsole: true,
    accessLogFormat: null
  }, config);
  
  // Attach to log events
  app.on('info_log', this.info);
  app.on('error_log', this.error);
  
  if (config.accessLog) this.enableAccessLog();
  
}

Logger.prototype.enableAccessLog = function() {
  // Cache access log format function
  var config = this.config;
  var accessLogFormat = this.config.accessLogFormat;
  
  if (!accessLogFormat) config.accessLogFormat = accessLogFormat = function(req, res, app) {
    var ms = Date.now() - req.startTime;
    return util.format('%s (%s) [%s] %s %s %s (%sms)', app.domain, app.date(), req.socket.remoteAddress, req.method, 
    req.url, res.statusCode, ms);
  };
  
  // Access log filter
  var accessLogFilter = function() {
    var log = accessLogFormat(this.request, this, app);
    if (config.accessLogConsole) console.log(log);
    accessLog.write(log+'\n');
  }
  
  accessLog = fs.createWriteStream(app.fullPath('log/access.log'), {flags: 'a'});
  app.on('request', function(req, res) {
    res.on('finish', accessLogFilter);
  });
}

Logger.prototype.info = function(msg) {
  infoLog.write(msg+'\n', 'utf8');
}

Logger.prototype.error = function(msg) {
  errorLog.write(msg+'\n', 'utf8');
}

module.exports = Logger;