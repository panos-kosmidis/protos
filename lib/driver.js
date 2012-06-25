
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
