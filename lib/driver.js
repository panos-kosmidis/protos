
/**
  @module lib
*/

var _ = require('underscore'),
    util = require('util'),
    inflect = protos.inflect,
    extract = protos.util.extract,
    Multi = require('multi'),
    slice = Array.prototype.slice;

/**
  Driver class. Implements the Model API.
  
  @private
  @constructor
  @class Driver
 */

function Driver() {

}

/**
  Storage instance

  @private
  @property storage
  @default null
 */
Driver.prototype.storage = null;

/**
  Cache timeout

  @private
  @property maxCacheTimeout
  @type integer
  @default 31536000
 */
Driver.prototype.maxCacheTimeout = 1 * 365 * 24 * 3600;

/**
  Cache keys. If overridden, these should be specified in the same order
  
  @private
  @property cacheKeys
  @type array
  @default ['cacheID', 'cacheTimeout', 'cacheInvalidate']
 */
Driver.prototype.cacheKeys = ['cacheID', 'cacheTimeout', 'cacheInvalidate'];

/**
  Prepends cache data to an arguments array
  
  @private
  @method addCacheData
  @param {object} o
  @param {array|object} args
 */
 
Driver.prototype.addCacheData = function(o, args) {
  if (this.storage) {
    if (args instanceof Array) {
      // Prepend cache object to array
      var cacheData = extract(o, this.cacheKeys, true);
      if (cacheData) args.unshift(cacheData);
    } else {
      // Transfer cacheKeys to object
      var key, i, cKeys = this.cacheKeys;
      for (i=0; i < cKeys.length; i++) {
        key = cKeys[i];
        args[key] = o[key] || null;
        delete o[key];
      }
    }
  }
}

/**
  Multi support.

  @method multi
  @param {object} context
  @param {object} config
 */
 
Driver.prototype.multi = function(config) {
  return new Multi(this, config);
}

/**
  Provides the Model Hooks to a specific model object

  @private
  @method provideTo
  @param {object} context
 */

Driver.prototype.provideTo = function(context) {
  // Get ancestor prototype
  var proto = this.constructor.prototype,
      methodsProto = Driver.prototype.__modelMethods;
  
  // Provide aliases from driver prototype
  _.extend(context, methodsProto);
  
  // Provide methods from self
  _.extend(context, this.__modelMethods);
  
  // Provide app methods
  provideAppMethods.call(this, context, methodsProto);
}

/**
  Sets the cache prefix
  
  @private
  @method setCachePrefix
  @param {string} prefix
 */
 
Driver.prototype.setCachePrefix = function(prefix) {
  this.__cachePrefix = (prefix || this.constructor.name.toLowerCase() + '_cache:');
}

/**
  Sets the method used in the driver that will be used
  in cache operations.
  
  These methods are the ones used in all the operations
  performed by the driver itself.
  
  The methods should be separated by commas.
  
  @private
  @method cacheClientMethods
  @param {object} client
  @param {string} *methods
 */

Driver.prototype.cacheClientMethods = function(client) {
  
  var methods = slice.call(arguments, 1),
      self = this,
      clientMethods = {};

  methods.forEach(function(key) {
    var method = client[key];
    if (method instanceof Function) {
      (function(k) {
        clientMethods[k] = client[k];
        client[k] = function() {
          var args = slice.call(arguments, 0);
          args.push(k); // Push method
          cachedQuery.apply(client, args);
        }
      }).call(self, key)
    } else {
      throw new Error('Not a method: ' + key);
    }
  });
  
  client.__driver = this;
  client.__methods = clientMethods;
}

/*
  Internal query caching function
  
  @private
 */

function cachedQuery() {
  
  // Redefine arguments as local
  var arguments = slice.call(arguments, 0);
  
  var client = this,
      self = client.__driver,
      methodName = arguments.pop(),
      clientMethod = client.__methods[methodName];

  var app = self.app,
      evtContext = self.className.toLowerCase() + '_',
      cachePrefix = self.__cachePrefix,
      cacheKeys = self.cacheKeys,
      invalidateCacheIDs = [],
      cid = cacheKeys[0],
      cto = cacheKeys[1],
      cin = cacheKeys[2];
  
  var params = (arguments.length >= 2) ? arguments.slice(1) : [];
  
  var cdata = arguments[0],
      cacheID = cdata[cid],
      timeout = cdata[cto],
      invalidate = cdata[cin];
      
  var validTimeout = (typeof timeout == 'number' && timeout > 0);
      
  if (cdata.constructor === Object && params.length == 1 && params[0] instanceof Function) {
    delete cdata[cid];
    delete cdata[cto];
    delete cdata[cin];
    params.unshift(cdata);
  } else if (typeof cdata != 'object' || (cacheID == null && invalidate == null)) {
    clientMethod.apply(client, [cdata].concat(params));
    return;
  }
  
  if (invalidate != null) {
    
    if ( !util.isArray(invalidate) ) invalidate = [invalidate];
    
    for (var i=0; i < invalidate.length; i++) {
      cacheID = invalidate[i];
      invalidateCacheIDs.push(cacheID);
      invalidate[i] = cachePrefix + cacheID;
    }
    
    self.storage.delete(invalidate, function(err) {
      var callback;
      if (err) {
        app.log(err);
        callback = params.pop();
        if (callback instanceof Function) callback.call(self, err);
      } else {
        app.debug("Invalidated cacheID '%s'", invalidateCacheIDs.join(', '));
        app.emit(evtContext + 'cache_invalidate', invalidateCacheIDs);
        clientMethod.apply(client, params);
      }
    });
    
  } else if (cacheID) {
    
    self.storage.get(cachePrefix + cacheID, function(err, cache) {
      var callback, origCallback;
      if (err) {
        app.log(err);
        callback = params.pop();
        if (callback instanceof Function) callback.apply(self, [err, null, null]);
      } else {
        if (cache != null) {
          app.debug("Using cache for cacheID '%s'", cacheID);
          cache = JSON.parse(cache);
          app.emit(evtContext + 'cache_use', cacheID, cache);
          origCallback = params.pop();
          if (origCallback instanceof Function) {
            origCallback.apply(self, cache);
          }
        } else {
          origCallback = params.pop();
          params.push(function() {
            var cacheKey, queryResults = slice.call(arguments, 0),
                err = queryResults[0]; // First returned arg should be `err`
            if (err) {
              app.log(err);
              callback = params.pop();
              if (callback instanceof Function) callback.call(self, err);
            } else {
              cacheKey = cachePrefix + cacheID;
              if (typeof timeout == 'number' && timeout > self.maxCacheTimeout) {
                timeout = self.maxCacheTimeout;
              }
              
              var multi = self.storage.multi();
              
              multi.set(cacheKey, JSON.stringify(queryResults));
              if (validTimeout) multi.expire(cacheKey, timeout);
              multi.exec(function(err, results) {
                if (err) {
                  app.log(err);
                  callback = params.pop();
                  if (callback instanceof Function) callback.apply(self, [err, null, null]);
                } else {
                  var expires;
                  if (app.debugLog) {
                    if (validTimeout) {
                      expires = (new Date(Date.now() + timeout * 1000)).toString();
                      app.debug("Stored new cache for cacheID '%s'. Expires %s", cacheID, expires);
                    } else {
                      app.debug("Stored new cache for cacheID '%s'.", cacheID);
                    }
                  }
                  app.emit(evtContext + 'cache_store', cacheID, cache, expires || null);
                  origCallback.apply(self, queryResults);
                }
              });
            }
          });
          
          clientMethod.apply(client, params);
          
        }
      }
    });
    
  } else {
    
    clientMethod.apply(client, params);
    
  }
}


/**

  **MODEL API**

  The Model API methods run in the model context. 
  The `this` object points to the model instance that
  inherited the methods below.
  
  The driver instance attached to the model can be 
  accessed via `this.driver`.
  
  
  **IMPLEMENTATION**
  
  Only the empty functions should be implemented in the
  drivers. The ones that provide common functionality 
  & aliases are passed over to the model and integrate 
  seamlessly with it.
  
  
  **CACHING**
  
  Model caching is done by the underlying driver, which 
  abstracts the caching functionality from the model.
  
  All the model methods in the API receive a `cdata`
  parameter, which is used to control the driver`s cache
  mechanism.

  @private
  @property __modelMethods
  @type object
*/

Driver.prototype.__modelMethods = {
  
/** 
  Creates a new model object. Saves into the
  database, then creates the model with the provided data.
  
  Validation should be performed against the values in `o`,
  throwing an Error if not satisfied.
  
  Provides: [err, model]
  
  @for Model
  @method new
  @param {object} o
  @param {object} cdata
  @param {function} callback
 */

  new: function(o, cdata, callback) {
    var self = this;

    // Process callback & cache Data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }

    // Model::insert > Get ID > Create Model
    this.insert(o, cdata, function(err, id) {
      if (err) callback.call(self, err, null);
      else {
        self.get(id, function(err, model) {
          if (err) callback.call(self, err, null);
          else {
            callback.call(self, null, model);
          }
        })
      }
    });
  },
  
/**
  Alias of `new`
  
  @for Model
  @method create
 */
  
  create: function() { this.new.apply(this, arguments); },
  
/** 
  Same behavior as new, but instead of returning a new object,
  returns the ID for the new database entry.
  
  Provides: [err, id]
  
  @for Model
  @method insert
  @param {object} o
  @param {object} cdata
  @param {function} callback
 */
   
  insert: function(o, cdata, callback) {},
  
/**
  Alias of `insert`
  
  @for Model
  @method add
 */  
  
  add: function() { this.insert.apply(this, arguments); },
  
/** 
  Gets an new model object.

  Type coercion is performed automatically, based on the
  type definition settings in the model's `properties`.

  The `o` argument can also contain an array of arguments,
  which can either be objects or integers. In this case,
  an array of models will be provided.

  Provides: [err, model]

  @for Model
  @method get
  @param {object|int|array} o
  @param {object} cdata
  @param {function} callback
*/
  
  get: function(o, cdata, callback) {},

/**
  Alias of `get`
  
  @for Model
  @method find
 */

  find: function() { this.get.apply(this, arguments); },

/** 
  Gets all records from the database
  
  @for Model
  @method getAll
  @param {object} cdata
  @param {function} callback
*/
  
  getAll: function(cdata, callback) {},
  
/**
  Alias of `getAll`
  
  @for Model
  @method findAll
 */
  
  findAll: function() { this.getAll.apply(this, arguments); },

/**
  Saves the model data into the Database.
  
  Since this method is called directly by the `ModelObject`s, 
  there is no need to validate, since the data provided in `o`
  has been properly validated.
  
  The item's ID to update is available on `o.id`.

  Provides: [err]
  
  @for Model
  @method save
  @param {object} o
  @param {function} callback
 */
   
  save: function(o, cdata, callback) {},
  
/**
  Alias of `save`
  
  @for Model
  @method update
 */  
  
  update: function() { this.save.apply(this, arguments); },
  
/**
  Deletes the model data from the database.
  
  The `id` argument can also contain an array of id's
  to remove from the database.

  Provides: [err]
  
  @for Model
  @method delete
  @param {int|array} id
  @param {object} cdata
  @param {function} callback
  @public
 */
   
  delete: function(id, cdata, callback) {},
  
/**
  Alias of `delete`
  
  @for Model
  @method destroy
 */
  
  destroy: function() { this.delete.apply(this, arguments); }
  
}

/*
  Provides app methods for model operations
  
  @param {object} model
  @param {object} methodsProto
  @private
 */
 
function provideAppMethods(model, methodsProto) {
  var key, method,
      app = model.app,
      cname = inflect.camelize(model.context),
      scname = inflect.singularize(cname),
      Application = this.app.constructor;
      
  for (key in methodsProto) {
    var suffix = (key.slice(-3) === 'All') ? cname : scname;
    method = key + suffix;
    (function(model, key, method) {
      app.model[method] = function() {
        model[key].apply(model, arguments);
      }
    }).call(this, model, key, method);
  }
}

module.exports = Driver;
