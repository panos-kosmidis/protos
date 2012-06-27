
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
  Performs a query with caching capabilities
  
  Cache data can contain the following:
  
  {
    cacheID: 'my_cache',
    cacheInvalidate: ['other_cache', 'cool_cache'],
    cacheTimeout: 3600,
    cachePrefix: 'protos',
    storage: redisStorage
  }
  
  By default, the driver's storage will be used, unless
  you override it by setting the storage on the cdata object.
  
  @method queryCached
  @param {object} cdata Cache Data
  @param {string} method Driver method to cache
  @param {mixed*} various Remaining method parameters
 */

Driver.prototype.queryCached = function() {
  var self = this,
      params = slice.call(arguments, 0),
      cdata = params[0],
      method = params[1],
      args = params.slice(2),
      callback = args.pop();
      
  // Storage can also be passed as part of cdata
  var storage = (cdata.storage || this.storage),
      app = storage.app;
  
  // Cache prefix can be specified via cdata.cachePrefix and defaults to className
  var cachePrefix = (cdata.cachePrefix || this.className).toLowerCase() + ':';
  
  var cacheID = cachePrefix + cdata.cacheID;
  var invalidate = cdata.cacheInvalidate;
  var timeout = cdata.cacheTimeout;
  
  if (storage) {
    
    if (invalidate) {
      
      if (typeof invalidate == 'string') {
        
        // Invalidate single id
        
        var invalidateID = cachePrefix + invalidate;
        
        storage.delete(invalidateID, function(err) {
          if (err) callback.call(self, err, null);
          else {
            
            if (app.debugLog) app.debug("Invalidated cache for " + invalidateID);

            if (cdata.cacheID) {
              
              // Regenerate cache after it has been invalidated
              __getSetCacheResults.call(self, storage, cacheID, method, args, callback, timeout);
              
            } else {
              
              // No cacheID, which means the intention was to invalidate. Proceed without further caching
              self[method].apply(self, args.concat([callback]));
              
            }
            
          }
        });
        
      } else {
        
        // Invalidate multiple id's
        
        var multi = new Multi(storage);
        
        for (i=0; i < invalidate.length; i++) {
          invalidateID = cachePrefix + invalidate[i];
          invalidate[i] = invalidateID;
          multi.delete(invalidateID);
        }
        
        multi.exec(function(err, results) {
          if (err) callback.call(self, err, null);
          else {
            
            if (cdata.cacheID) {
              
              // Regenerate cache after it has been invalidated
              if (app.debugLog) app.debug("Invalidated cache for " + invalidate.join(', '));
              __getSetCacheResults.call(self, storage, cacheID, method, args, callback, timeout);
              
            } else {
              
              // No cacheID, which means the intention was to invalidate. Proceed without further caching
              self[method].apply(self, args.concat([callback]));
              
            }
            
          }
        });
        
      }
      
    } else if (cdata.cacheID) {
      
        // Cache ID Available...
      
        // See if cache is available
        __getSetCacheResults.call(this, storage, cacheID, method, args, callback, timeout);
        
    } else {
      
      // No cacheID, proceed without caching
      this[method].apply(this, args.concat([callback]));
      
    }
      
  } else {
    
    // No Storage. Warn and proceed without caching
    app.log(util.format("%s: not caching since no storage is attached", this.className));
    this[method].apply(this, args.concat([callback]));

  }
}

/*
  Private function in charge of storing the cache and setting timeouts
  
  @private
  @param {object} storage
  @param {string} cacheID
  @param {string} method
  @param {array} args
  @param {function} callback
  @param {int} timeout
 */

function __getSetCacheResults(storage, cacheID, method, args, callback, timeout) {

  var self = this,
      app = storage.app;

  // See if cache is available
  storage.get(cacheID, function(err, data) {
    
    if (err) callback.call(self, err, null);
    
    else {
      
      if ( data ) {
        
        // Object found in cache
        
        // Run callback with cached array
        var results = JSON.parse(data);
        if (app.debugLog) app.debug("Using cached data for " + cacheID);
        callback.apply(self, results);
        
      } else {
        
        // Cache new data
        
        self[method].apply(self, args.concat([function(err) {
          
          if (err) callback.call(self, err, null);
          
          else {
            
            // Get results array from arguments
            var results = slice.call(arguments, 0);
            
            // Set cache data
            storage.set(cacheID, JSON.stringify(results), function(err) {
              if (err) callback.call(self, err, null);
              else {
                
                // If timeout available, set expiration
                if (timeout && typeof timeout == 'number') {
                  
                  // Set cache expiration
                  storage.expire(cacheID, timeout, function(err) {
                    
                    if (err) callback.call(self, err, null);
                    
                    else {
                      
                      // Run callback with results array (after expiration set)
                      if (app.debugLog) app.debug(util.format("Cached new data for %s (expires in %d seconds)", cacheID, timeout));
                      callback.apply(self, results);
                      
                    }
                    
                  });
                  
                } else {
                  
                  // Run callback with results array
                  if (app.debugLog) app.debug("Cached new data for " + cacheID);
                  callback.apply(self, results);  
                  
                }
                
              }
            });
          }
        }]));
        
      }
    }
    
  });

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
  @param {function} callback
 */

  new: function(o, callback) {
    var self = this;

    // Model::insert > Get ID > Create Model
    this.insert(o, function(err, id) {
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
  @param {function} callback
 */
   
  insert: function(o, callback) {},
  
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
  @param {function} callback
*/
  
  get: function(o, callback) {},

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
  @param {function} callback
*/
  
  getAll: function(callback) {},
  
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
   
  save: function(o, callback) {},
  
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
  @param {function} callback
  @public
 */
   
  delete: function(id, callback) {},
  
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
