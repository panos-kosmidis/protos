
/**
  Logger
  
  Application logger. Also provides request logging functionality, supporting
  custom logging formats.
  
  The logging functions are exposed by the middleware object, and connected to the
  `info_log` and `error_log` events of the application.
  
  Error logs are conveniently printed with a stack trace, for proper inspection.
  
  The log events are emitted by `app.log`. If an `Error` instance is passed to it,
  the `error_log` event is automatically emitted with the error in question.
  
  » Configuration Options:
  
    {boolean} accessLog: If set to true (default), will save requests to the access.log file
    {boolean} accessLogConsole: If set to true (default), will log requests to the console
    {function} accessLogFormat: Function to use to format the logs
    
  » Log Levels
  
    To set a log level, you specify the log level alias, ending with 'Level', for example:
    
    app.use('logger', {
      noticeLevel: {
        console: true,
        file: 'notice.log'
      },
      my_coolLevel: {
        console: true
      },
      criticalLevel: {
        file: 'critical.log',
        console: true,
        mongodb: true
      }
    });
    
    Each level adds its own methods you can use to log messages. For example, the levels set on the example
    code above, will set the following methods in the app singleton:
    
      app.noticeLog(log);
      app.myCoolLog(log);
      app.criticalLog(log);
      
    Each method accepts printf-like arguments. Additionally, the middleware sets events for the levels you
    specify in the config. For example, the following events will be set with the config used above:
    
      notice_log
      my_cool_log
      critical_log
      
    You can hook your own functions to manage the logs sent to each level.
    
    By default, the path is relative to the application's log/ directory. You can also specify absolute paths for
    logs using the file transport.
    
 */

var app = protos.app,
    fs = require('fs'),
    http = require('http'),
    util = require('util'),
    inflect = protos.require('./lib/support/inflect.js');

var Application = app.constructor;

var accessLog;

// Transports
var logTransports = {
  console: require('./transport-console.js'),
  file: require('./transport-file.js'),
  mongodb: require('./transport-mongodb.js'),
  redis: require('./transport-redis.js')
}

function Logger(config, middleware) {
  
  // Attach to app singleton
  app[middleware] = this;
  
  // Expose transport constructors
  for (var t in logTransports) {
    t = logTransports[t];
    this[t.name] = t;
  }
  
  // Define access log data in same closure (faster access)
  var accessLogConsole,
      domain = app.hostname,
      appDate = app.date;
  
  // Middleware config (levels are overridden)
  this.config = config = protos.extend({
    accessLogFile: null,          // File to save access logs. E.g.: 'access.log'
    accessLogConsole: true,       // Log requests to stdout
    accessLogFormat: 'default',   // Access log format
    infoLevel: {console: true},   // Set to {console: true, file: 'info.log'} to log to stdout + file
    errorLevel: {console: true}   // Set to {console: true, file: 'error.log'} to stdout + file
  }, config);
  
  // Enable access log
  if (config.accessLogFile || config.accessLogConsole) this.enableAccessLog();
  
  // Create logging levels
  createLoggingLevels.call(this, config);
  
  // console.exit(this);
}

Logger.prototype.enableAccessLog = function() {
  // Cache access log format function
  var self = this,
      config = this.config,
      accessLogFormat = config.accessLogFormat;
      
  if (typeof accessLogFormat == 'string') {
    if (accessLogFormat in this.logFormats) {
      accessLogFormat = this.logFormats[accessLogFormat];
    } else {
      throw new Error("Logger: Unknown log format: " + accessLogFormat);
    }
  } else if (typeof accessLogFormat != 'function') {
    throw new Error("Logger: accessLogFormat accepts either a string or a function: " + accessLogFormat);
  }
  
  // Access log filter
  var accessLogFilter = function() {
    var log = accessLogFormat.call(self, this.request, this, app);
    app.emit('access_log', log);
    if (config.accessLogConsole) console.log(log);
    if (config.accessLogFile) accessLog.write(log+'\n');
  }
  
  if (config.accessLogFile) accessLog = fs.createWriteStream(app.fullPath('log/' + config.accessLogFile), {flags: 'a'});
  app.on('request', function(req, res) {
    res.on('finish', accessLogFilter);
  });
}

Logger.prototype.logFormats = {
  default: function(req, res, app) {
    var ms = Date.now() - req.startTime;
    return util.format('%s (%s) [%s] %s %s %s (%s)', app.hostname, app.date(), req.socket.remoteAddress, req.method, 
    req.url, res.statusCode, this.timeDelta(ms));
  },
  detailed: function(req, res, app) {
    var ms = Date.now() - req.startTime;
    return util.format('%s (%s) [%s] %s %s %s (%s) - %s', app.hostname, app.date(), req.socket.remoteAddress, req.method, 
    req.url, res.statusCode, this.timeDelta(ms), req.headers['user-agent']);
  }
}

Logger.prototype.timeDelta = function(ms) {
  var s, m, h, p=2;
  if (ms >= 1000) {
    s = ms / 1000.0;
    if (s < 60) {
      // seconds
      return s.toFixed(p) + 's';
    } else if (s < 3600) {
      // minutes
      m = s / 60.0;
      return m.toFixed(p) + 'min';
    } else {
      // hours
      h = s / 3600.0;
      return h.toFixed(p) + 'hr';
    }
  } else {
    // Return miliseconds
    return ms + 'ms';
  }
}

function createLoggingLevels(config) {
  /*jshint immed: false */
  var level, options, transports, lvlRegex = /Level$/;
  this.transports = {};
  for (level in config) {
    if (lvlRegex.test(level)) {
      transports = config[level];
      
      if (!transports) continue;
      
      level = level.replace(lvlRegex, '');
      this.transports[level] = {};

      for (var transport in transports) {
        
        if (!transports[transport]) continue; // Ignore if transport's config is false

        if (transport in logTransports) {
          var Ctor = logTransports[transport];
          
          this.transports[level][transport] = new Ctor(level+'_log', transports[transport]);
          
          // Extend application with {level}Log method
          
          (function(app, format) {
            
            var context = {level: level, event: level+'_log', app: app}; // Reuse object
            
            Application.prototype[inflect.camelize(level, true)+'Log'] = function() {
              app.log.apply(context, arguments);
            }
            
          }).call(this, app, util.format);
          
        } else {
          throw new Error("Logger: transport not found: " + transport);
        }
      }
    }
  }
}

module.exports = Logger;