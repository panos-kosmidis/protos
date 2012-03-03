
/* Logger » Redis Transport */

var app = corejs.app,
    fs = require('fs'),
    redis = require('redis');

function RedisTransport(evt, config) {
  
  var self = this;
  
  if (config === true) config = {};
  
  config = corejs.extend({
    host: 'localhost',
    port: 6379,
    db: 0,
    logKey: evt,
    password: null,
    logLimit: 3
  }, config);
  
  Object.defineProperty(this, 'config', {
    value: config,
    writable: true,
    enumerable: false,
    configurable: false
  });
  
  // Log messages queue
  var queue = [];
  
  // Log messages queue: handle logs while acquiring redis client
  var preCallback = function(log) {
    if (self.client) postCallback(log);
    else queue.push(log);
  }
  
  // Callback to run when client is ready
  var postCallback = function(log) {
    self.pushLog(log);
  }
  
  // Temporary logging event, until client is ready
  app.on(evt, preCallback);
  
  initRedis.call(this, config, function(err) {
    if (err) app.log(err);
    else {
      
      // Remove log queue listener
      app.removeListener(evt, preCallback);

      // Hook new listen event
      app.on(evt, postCallback);

      // Flush log queue
      queue.forEach(postCallback);
      queue = [];
      
    }
  });

  this.className = this.constructor.name;

}

/**
  Pushes a log into redis
  
  @param {string} log
  @private
 */

RedisTransport.prototype.pushLog = function(log) {
  var self = this,
      config = this.config,
      logKey = config.logKey;
  this.client.lpush(logKey, log, function(err, count) {
    if (err) app.log(err);
    else if (count > config.logLimit) {
      self.client.ltrim(logKey, 0, config.logLimit-1, function(err) {
        if (err) app.log(err);
      });
    }
  });
}

/**
  Initializes the redis client
  
  @param {object} config
  @param {function} callback
  @private
 */

function initRedis(config, callback) {

  var self = this;

  corejs.util.checkPort(config.port, function(err) {

    if (err) {
      app.log("RedisTransport [%s:%s] %s", config.host, config.port, err.code);
    } else {

      // Set redis client
      self.client = redis.createClient(config.port, config.host, self.options);

      // Handle error event
      self.client.on('error', function(err) {
        callback.call(self, err);
      });

      // Authenticate if password provided
      if (typeof config.password == 'string') {
        self.client.auth(config.password, function(err, res) {
          if (err) {
            app.log("RedisTransport: [%s:%s] %s", config.host, config.port, err.code);
          } else if (typeof config.db == 'number' && config.db !== 0) {
            self.client.select(config.db, function(err, res) {
              if (err) callback.call(self, err);
              else callback.call(self, null);
            });
          } else {
            callback.call(self, null);
          }
        });
      } else if (typeof config.db == 'number' && config.db !== 0) {
        self.client.select(config.db, function(err, res) {
          callback.call(self, err);
        });
      } else {
        callback.call(self, null);
      }

    }
  });

}

module.exports = RedisTransport;