
/* Logger » MongoDB Transport */

var app = protos.app,
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    ObjectID = mongodb.ObjectID,
    Collection = mongodb.Collection;

function MongoTransport(evt, config) {
  
  var self = this;
  
  // Accept mongodb: true for default settings
  if (config === true) config = {};
  
  // Transport configuration
  config = protos.extend({
    host: 'localhost',
    port: 27017,
    database: 'myapp',
    collection: evt,
    logSize: 10*1024*1024,
    logLimit: null
  }, config);
  
  Object.defineProperty(this, 'config', {
    value: config,
    writable: true,
    enumerable: true,
    configurable: false
  });
  
  // Log messages queue: handle logs while acquiring collection instance
  var queue = [];

  // Callback to run when collection is ready
  var preCallback = function(log) {
    if (self.collection) postCallback(log);
    else queue.push(log);
  }
  
  // Callback to hook when collection is ready
  var postCallback = function(log) {
    self.pushLog(log);
  }
  
  // Temporary logging event, until collection is ready
  app.on(evt, preCallback);
  
  initMongo.call(this, config, function() {
    
    // Remove log queue listener
    app.removeListener(evt, preCallback);
    
    // Hook new listen event
    app.on(evt, postCallback);
    
    // Flush log queue
    queue.forEach(postCallback);
    queue = [];
    
  });
  
  this.className = this.constructor.name;
  
}

/**
  Pushes a log into MongoDB
  
  @param {string} log
  @private
 */

MongoTransport.prototype.pushLog = function(log) {
  this.collection.insert({log: log}, logHandler);
}

/**
  Cached handler for mongodb log events
  
  @param {Error} err
  @private
 */

function logHandler(err) {
  if (err) app.log(err);
}

/**
  Initializes the MongoDB Client & Collection
  
  @param {object} config
  @param {function} callback
  @private
 */

function initMongo(config, callback) {
  
  var self = this;
  
  // Set db
  self.db = new Db(config.database, new Server(config.host, config.port, {}));
  
  // Get client
  self.db.open(function(err, client) {
    if (err) throw err;
    else {
      self.client = client;
      client.collectionNames(function(err, names) {
        if (err) throw err;
        else {
          var name = config.database + '.' + config.collection;
          var exists = names.filter(function(col) {
            if (col.name == name) return col; 
          });
          
          // Collection options
          var opts = {capped: true, size: config.logSize};
          if (config.logLimit != null) opts.max = config.logLimit;
          
          if (exists.length === 0) {
            client.createCollection(config.collection, opts, function(err, collection) {
              if (err) throw err;
              else {
                self.collection = collection;
                callback.call(self);
              }
            });
          } else {
            // Get collection
            client.collection(config.collection, function(err, collection) {
              if (err) throw err;
              else {
                self.collection = collection;
                // Get collection options » Check if collection has already been capped
                collection.options(function(err, options) {
                  if (err) {
                    throw err;
                  } else {
                    // Check if collection's options match log requirements
                    var ready = (options.capped === true && options.size === opts.size);
                    if ('max' in opts) ready = (ready && options.max === opts.max);
                    if (!ready) {
                      // Convert collection to capped if it's not match log requirements
                      var cmd = {"convertToCapped": config.collection, size: opts.size};
                      if ('max' in opts) cmd.max = opts.max;
                      client.command(cmd, function(err) {
                        if (err) throw err;
                        else {
                          callback.call(self);
                        }
                      });
                    } else {
                      callback.call(self);
                    }
                  }
                });
              }
            });
          }
        }
      });
    }
  });
}

module.exports = MongoTransport;