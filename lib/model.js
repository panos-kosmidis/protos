
/* Model */

var _ = require('underscore'),
    _s = require('underscore.string'),
    util = require('util'),
    inflect = require('./support/inflect.js'),
    slice = Array.prototype.slice,
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

function Model() {

}

util.inherits(Model, EventEmitter);

// Defines model properties
Model.prototype.properties = null;

// Defines local model validation rules
Model.prototype.validation = {
  timestamp: function(date) {
    // Validates timestamps against native JavaScript `Date`
    if (date instanceof Date) return date;
    else {
      var time = Date.parse(date);
      return (typeof time == 'number' && time >= 0);
    }
  }
}

/**
  Prepares the model and its low level configuration
  
  @param {object} app
 */

Model.prototype.prepare = function(app) {
  
  // Exit if drivers are not ready yet
  if (typeof app == 'undefined' || typeof app.drivers.default == 'undefined') return;
  
  var name, validation, self = this;
  
  Object.defineProperty(this, 'app', {
    value: app,
    writable: true,
    enumerable: false,
    configurable: false
  });
  
  name = this.driver = (this.driver || app.config.database.default);

  // Get driver
  if (typeof this.driver == 'string') {
    this.driver = app._getResource('drivers/' + this.driver);
  } else if (! this.driver instanceof corejs.lib.driver) {
    throw new Error(util.format("Driver config not found: '%s'", name));
  }

  // Extend validation
  validation = _.extend({}, this.constructor.prototype.validation);
  this.validation = _.extend(validation, this.validation || {});    
  
  // Default properties
  this.__defaultProperties = {};
  
  // Linked properties (usually called foreign keys)
  this.__linkedProperties = [];
  
  // Set classname
  this.className = this.constructor.name;
  
  // ModelObject prototype (used by `setRelationships`)
  this.modelObjectProto = new (createModelObject.call(this));

  // Get defaults from this.properties
  var key, prop;
  for (key in this.properties) {
    prop = this.properties[key];
    if ('default' in prop) {
      this.__defaultProperties[key] = prop.default;
    }
  }
  
  // Set defaultProperties to null if none found
  if (Object.keys(this.__defaultProperties).length == 0) this.__defaultProperties = null;
  
  // Connect driver with self
  this.driver.provideTo(this);
  
  // Set context
  this.context = getContext(this.className);
  
  // Set model relationships on 'models_init' event
  app.once('models_init', function(models) {
    setRelationships.call(self);
  });

  corejs.util.onlySetEnumerable(this, ['className']);
}

/**
  Typecasts an object based on its defined property types
  
  @param {object} o
  @private
 */

Model.prototype.typecast = function(o) {
  
  var key, val, prop, type, date, func,
      properties = this.properties,
      regex = corejs.regex,
      boolRegex = regex.boolean,
      bynaryRegex = regex.binary,
      invalidData = 'Invalid Data';
  
  for (key in o) {
    val = o[key];
    
    if (key == 'id' && typeof val == 'string') {
      o[key] = parseInt(val, 10);
    }
    
    // Do not typecast if it's not a string
    if (this.properties[key] == null) continue;

    type = properties[key].type;
    
    // Type coercions
    // Defined in property `type` definitions
    
    switch (type) {
      case 'string':
        if (val === '' && this.__linkedProperties.indexOf(key) >= 0) {
          o[key] = null;
        } 
        break;
      
      case 'integer':
        o[key] = parseInt(val, 10);
        break;
        
      case 'boolean':
        if (typeof val != 'boolean') {
          if (typeof val == 'string') {
            val = val.trim().toLowerCase();
            o[key] = (val === 'true' || val === '1');
          } else if (typeof val == 'number') {
            o[key] = (val === 1);
          } else {
            o[key] = new Error(invalidData);
          }
        }
        break;

      case 'timestamp':
        if (typeof val == 'string') {
          date = new Date(val.trim());
          if (isNaN(date)) {
            o[key] = new Error(invalidData);
          } else {
            o[key] = date;
          }
        }
        break;
    
      case 'object':
      case 'array':
        try {
          o[key] = JSON.parse(val);
        } catch(e) {
          this.app.log('Unable to parse JSON data: ' + JSON.stringify(o));
          o[key] = new Error('Corrupted data'); // deal with it
        }
        break;
      
      default: break;
      
    }
    
  }
  
}

/**
  Creates a model object
  
  @param {array|object} obArr
  @returns {array} models
  @private
 */
 
Model.prototype.createModel = function(o) {
  var ob, key, type, val, type,
      idFilter = this.driver.idFilter,
      descriptor = {}, 
      currentState = {},
      proto = this.modelObjectProto;
  
  // Typecast values in `o`
  this.typecast(o);
  
  // Filter id value in object
  idFilter instanceof Function && idFilter(o);
  
  // Add property descriptors
  for (key in o) {
    if (key == 'id') {
      // The id property is immutable
      descriptor[key] = {value: o[key], writable: false, enumerable: true, configurable: false};
    } else {
      descriptor[key] = {value: o[key], writable: true, enumerable: true, configurable: true};
    }
  }
  
  var currentState = this.createCurrentState(o);
  
  // console.exit(currentState);
  
  descriptor.__currentState = {value: currentState, writable: false, enumerable: false, configurable: false}
  
  // Create ModelObject
  ob = Object.create(proto, descriptor);
  
  // Freeze oject current state
  Object.freeze(ob.__currentState);
  
  this.emit('create', null, ob);
  
  return ob;
}

/**
  Creates a current state object, used to detect changes in model data.
  
  @param {object} o
  @private
 */

Model.prototype.createCurrentState = function(o) {
  var key, val, type, out = {};
 
  for (key in o) {
    if (key in this.properties) {
      type = this.properties[key].type;
      if (key == 'id') continue;
      switch (type) {
        case 'string':
        case 'integer':
        case 'boolean':
          out[key] = o[key];
          break;
        case 'timestamp':
          out[key] = JSON.stringify(o[key]).slice(1,-1);
          break;
        default:
          out[key] = JSON.stringify(o[key]);
          break;
     }
   }
}
 
 // console.exit(out);
 
 return out;
}

/**
  Checks if an object contains properties found in model
  
  @param {object} o
  @private
 */
 
Model.prototype.propertyCheck = function(o) {
  var key, len, badProperties = [],
      properties = this.properties;
  
  // Check if properties in `o` are valid
  for (key in o) {
    if (! properties.hasOwnProperty(key)) badProperties.push(key);
  }
  
  len = badProperties.length;
  
  if (len == 1) {
    throw new Error(util.format("%s: Property does not belong to model: '%s'", 
      this.className, badProperties[0]));
  } else if (len > 1) {
    throw new Error(util.format("%s: Properties do not belong to model: [%s]", 
      this.className, badProperties.join(', ')));
  }
}

/**
  Validates model properties
  
  @param {object} o
  @param {boolean} checkRequired
  @private
 */
 
Model.prototype.validateProperties = function(o, options) {
  var key, val, regex, prop, validates, required, len, err = false,
      badProperties = [],
      app = this.app,
      properties = this.properties,
      unableToValidate = "%s: Unable to validate '%s': %s";
  
  // Parse options
  options = options || {};
  var noRequired = options.noRequired;
  var returnErrors = options.returnErrors;

  // Check properties
  this.propertyCheck(o);

  for (key in properties) {
    prop = properties[key];

    // Check for required property
    if (!noRequired && prop.required && !o.hasOwnProperty(key)) {
      err = new Error(util.format("%s: '%s' is required", this.className, key));
      if (returnErrors) return err; else throw err;
    }
    
    // Check if property is valid
    validates = prop.validates;
    if (key in o && typeof validates != 'undefined') {
      val = o[key];
      if (validates instanceof RegExp) {
        // Regex validation
        if (! validates.test(val)) {
          err = new Error(util.format(unableToValidate, this.className, key, val));
          if (returnErrors) return err; else throw err;
        }
      } else if (typeof validates == 'string') {
        regex = this.validation[validates] || app.regex[validates];
        if (regex instanceof RegExp) {
          // Regexp alias validation
          if (! regex.test(val)) {
            err = new Error(util.format(unableToValidate, this.className, key, val));
            if (returnErrors) return err; else throw err;
          }
        } else if (regex instanceof Function) {
          // Function validation
          if (!regex(val)) {
            err = new Error(util.format(unableToValidate, this.className, key, val));
            if (returnErrors) return err; else throw err;
          }
        } else {
          // Regex can't be found
          err = new Error(util.format("%s: Can't find regex: '%s'", this.className, validates));
          if (returnErrors) return err; else throw err;
        }
      } else {
        // Wrong validation data provided
        validates = (validates === null) ? 'null' : validates.toString();
        err = new Error(util.format("%s: Wrong validation data for '%s': %s", this.className, key, validates));
        if (returnErrors) return err; else throw err;
      }
    }
  }
  
  if (returnErrors) return null;
  
}

/**
  Sets default options to object, before inserting
  
  @param {object} data
  @private
 */
 
Model.prototype.setDefaults = function(data) {
  var key, defval, propType, 
      defaults = this.__defaultProperties;
      
  if (defaults) {
    for (key in defaults) {
      
      // Property type
      propType = this.properties[key].type;
      
      if (! (key in data)) {
        
        defval = defaults[key];
        
        if (defval instanceof Function) {
          // Default callbacks receive data as input, just
          // in case the default depends on the data provided.
          data[key] = defval(data);
        } else if (propType == 'array') {
          // Array defaults (json)
          if (defval && defval instanceof Array) {
            data[key] = JSON.stringify(defval);
          } else {
            this.app.log(util.format("%s: Invalid default value for %s property '%s': %s", 
              this.className, propType, key, defval));
          }
        } else if (propType == 'object') {
          // Object defaults (json)
          if (defval && defval.constructor === Object) {
            data[key] = JSON.stringify(defval);
          } else {
            this.app.log(util.format("%s: Invalid default value for %s property '%s': %s", 
              this.className, propType, key, defval));
          }
        } else {
          data[key] = defval;
        }

      }
    }
  }
  
  // console.exit(data);
  
}

/** 
  Converts custom model types to JSON

  @param {object} data
  @public
 */

Model.prototype.convertTypes = function(o) {
 var key, val, type;
 for (key in o) {
   val = o[key];
   type = (this.properties[key] && this.properties[key].type);
   switch (type) {
     case 'object':
     case 'array':
        o[key] = JSON.stringify(val);
        break;
     case 'timestamp':
        break;
     default: break;
   }
 }
}

/**
  Multi support.
  
  @param {object} context
  @param {object} config
  @public
 */
 
Model.prototype.multi = function(config) {
  return new Multi(this, config);
}

/**
  Creates the ModelObject class
  
  @returns {function} ModelObject
 */

function createModelObject() {
  var key, method,
      self = this,
      generator = this;
      
  function ModelObject() {
    this.className = generator.className + 'Object';
  }
  
  /* Model Generator */
  
  ModelObject.prototype.generator = this;
  
  /* Save model data */
  
  var gen = this;
  
  ModelObject.prototype.save = function(cdata, callback) {
    
    var key, val, valid, err, type,
        self = this,
        diff = 0,
        update = {};      
    
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }

    var currentState = gen.createCurrentState(this),
        origState = this.__currentState;
    
    for (key in currentState) {
      if (currentState[key] !== origState[key]) {
        update[key] = currentState[key]; diff++;
      }
    }
    
    // console.exit(update);
    
    // No changes
    if (diff === 0) { callback.call(self, null); return; }
    
    // Validate data prior to sending to the driver
    err = generator.validateProperties(update, {noRequired: true, returnErrors: true});
    
    if (err) callback.call(this, err);
    else {
      // Perform driver save
      update.id = this.id;
      
      generator.save(update, cdata, function(err) {
        generator.emit('save', err, self);
        callback.call(self, err);
      });
    }
  }
  
  ModelObject.prototype.update = ModelObject.prototype.save; // alias
  ModelObject.prototype.sync = ModelObject.prototype.save; // alias
  
  /* Delete model data */
  
  ModelObject.prototype.delete = function(cdata, callback) {

    var self = this,
        generator = this.generator;
    
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }
    
    generator.delete(this.id, cdata, function(err) {
      generator.emit('delete', err, self);
      callback.call(self, err);
    });
    
  }
  
  ModelObject.prototype.remove = ModelObject.prototype.delete; // alias
  ModelObject.prototype.destroy = ModelObject.prototype.delete; // alias

  /* Create Multi */
  
  ModelObject.prototype.createMulti = function(options) {
    return new Multi(this, options);
  }  
  
  
  return ModelObject;
  
}

/**
  Returns the model context, analogous to the table, collection, etc.
  
  @param {string} string
  @returns {string} context
  @private
 */

function getContext(string) {
  return _s.dasherize(string)
  .slice(1)
  .replace(/-/g,'_')
  .replace(/_model$/, '');
}

/**
  Sets model relationships
  
  @param {object} context
  @private
 */

function setRelationships() {
  
  var self = this,
      nameRegex = /^([a-z][a-z0-9\-\_]+)(\([a-z][a-z0-9\-\_]+\))?$/,
      belongsRegex = /^([a-z][a-z0-9\-\_]+)\.([a-z][a-z0-9\-\_]+)$/;
      
  var ModelObject = this.modelObjectProto.constructor;
  
  // Has One relationship
  
  if (typeof this.hasOne != 'undefined') {
    
    if (typeof this.hasOne == 'string') this.hasOne = [this.hasOne];
    else if (! (this.hasOne instanceof Array)) {
      throw new Error(util.format("%s: Invalid value for 'hasOne' relationship: %s", this.className, this.hasOne));
    }
    
    for (var matches, item, i=0; i < this.hasOne.length; i++) {
      item = this.hasOne[i];
      matches = item.match(nameRegex);
      if (matches) {
        // Note: name & alias should be in singular form
        var alias = matches[1],
            name = matches[2] && matches[2].slice(1,-1);
        
        if (!name) { name = alias; alias = null; }
        
        __hasOne.call(this, name, alias);
        
        // console.exit(this.properties);
        
      } else {
        throw new Error(util.format("%s: Unable to match model in 'hasOne' relationship: %s", this.className, item));
      }
    }
    
    // console.exit(self.__defaultProperties);
    // console.exit(ModelObject.prototype);
    // console.exit(this.properties);
    
  }
  
  // Has Many relationship
  
  if (typeof this.hasMany != 'undefined') {
    
    if (typeof this.hasMany == 'string') this.hasMany = [this.hasMany];
    else if (! (this.hasMany instanceof Array)) {
      throw new Error(util.format("%s: Invalid value for 'hasMany' relationship: %s", this.className, this.hasMany));
    }
    
    for (var matches, item, i=0; i < this.hasMany.length; i++) {
      item = this.hasMany[i];
      matches = item.match(nameRegex);
      
      if (matches) {
        
        // hasMany: name & alias should be in plural form
        var alias = matches[1],
            name = matches[2] && matches[2].slice(1,-1);
        
        if (!name) { name = alias; alias = null; }
        
        __hasMany.call(this, name, alias);
        
        // console.exit(this.properties);
        
      } else {
      
        throw new Error(util.format("%s: Unable to match model in 'hasMany' relationship: %s", this.className, item));
        
      }
      
      // console.exit(self.__defaultProperties);
      // console.exit(ModelObject.prototype);
      // console.exit(this.properties);
      
    }
    
  }
  
  // Belongs To relationship
  
  if (typeof this.belongsTo != 'undefined') {
    
    if (typeof this.belongsTo == 'string') this.belongsTo = [this.belongsTo];
    else if (! (this.belongsTo instanceof Array)) {
      throw new Error(util.format("%s: Invalid value for 'belongsTo' relationship: %s", this.className, this.belongsTo));
    }
    
    for (var matches, item, i=0; i < this.belongsTo.length; i++) {
      item = this.belongsTo[i];
      matches = item.match(belongsRegex);
      if (matches) {
        
        var name = matches[1],
            prop = matches[2];
            
        __belongsTo.call(this, name, prop);
        
      } else {
        
        throw new Error(util.format("%s: Unable to match model in 'belongsTo' relationship: %s", this.className, item));
        
      }
      
    }
    
  }
  
  // Belongs To Many relationship
  
  if (typeof this.belongsToMany != 'undefined') {
    
    if (typeof this.belongsToMany == 'string') this.belongsToMany = [this.belongsToMany];
    else if (! (this.belongsToMany instanceof Array)) {
      throw new Error(util.format("%s: Invalid value for 'belongsToMany' relationship: %s", this.className, this.belongsToMany));
    }
    
    for (var matches, item, i=0; i < this.belongsToMany.length; i++) {
      item = this.belongsToMany[i];
      matches = item.match(belongsRegex);
      if (matches) {
        
        var name = matches[1],
            prop = matches[2];
            
        __belongsToMany.call(this, name, prop);
        
      } else {
        
        throw new Error(util.format("%s: Unable to match model in 'belongsToMany' relationship: %s", this.className, item));
        
      }
      
    }
    
  }
    
}

/**
  Sets a hasOne relationship
  
  @param {string} name
  @param {string} alias
  @private
 */
 
function __hasOne(name, alias) {
    
  var self = this;
  
  // Get ModelObject
  var ModelObject = this.modelObjectProto.constructor;
  
  // Get model id (plural)
  var plural = inflect.pluralize(name);
  
  // Get model
  var model = this.app.models[plural];
  
  // console.log(model);
  
  // Throw error if model not found
  if (!model) throw new Error(util.format("%s: Model not found for 'hasOne' relationship: %s", 
    this.className, plural));
    
  // Make name & alias to use underscores instead of dashes
  name = name.replace(/-/g, '_');
  if (alias) alias = alias.replace(/-/g, '_');
  
  // Set property name
  var prop = (alias || name);
    
  // Register property in model
  this.properties[prop] = {type: 'string', default: ''};
  this.__linkedProperties.push(prop);
  
  // Register default property
  if (! this.__defaultProperties) self.__defaultProperties = {};
  this.__defaultProperties[prop] = '';
  
  // Get cname for get/set/remove operations
  cname = inflect.camelize(alias || name);

  // Remove function
  var removeFunc = function(deep, cb) {
    var slf = this;
    if (!cb) { cb = deep; deep = false; }
    if (this[prop]) {
      if (deep) {
        model.delete(this[prop], function(modelErr) {
          if (cb instanceof Function) {
            slf[prop] = '';
            slf.save(function(err) {
              if (modelErr && err) cb.call(this, [modelErr && err]);
              else cb.call(this, modelErr || err);
            });
          } else if (modelErr) {
            self.app.log(modelErr);
          }
        });
      } else if (cb instanceof Function) {
        this[prop] = '';
        this.save(cb);
      }
    } else if (cb instanceof Function) {
      cb.call(this, null);
    }
  }

  // get{Item}
  ModelObject.prototype['get' + cname] = function(cb) {
    var slf = this, id = this[prop];
    if (id) {
      model.get(id, function(e, m) {
        cb.call(slf, e, m);
      });
    } else cb.call(this, null, null);
  }

  // set{Item}
  ModelObject.prototype['set' + cname] = function(item, cb) {
    var id = (item.id || item);  // Accept {object|id}
    this[prop] = id.toString();  // ensure string type
    if (cb instanceof Function) this.save(cb);
    return this;
  }
  
  // remove{Item}
  ModelObject.prototype['remove' + cname] = function(cb) {
    removeFunc.call(this, cb);
  }
  
  // deepRemove{Item}
  ModelObject.prototype['deepRemove' + cname] = function(cb) {
    removeFunc.call(this, true, cb);
  }

}

/**
  Sets a hasMany relationship
  
  @param {string} name
  @param {string} alias
  @private
 */
 
function __hasMany(name, alias) {
  
  var self = this;
  
  // Get ModelObject
  var ModelObject = this.modelObjectProto.constructor;
  
  // Get model (name already in plural)
  var model = this.app.models[name];
  
  // console.exit(model);
  
  // Throw error if model not found
  
  if (!model) throw new Error(util.format("%s: Model not found for 'hasMany' relationship: %s",
    this.className, name));
    
  // Make name & alias to use underscores instead of dashes
  name = name.replace(/-/g, '_');
  if (alias) alias = alias.replace(/-/g, '_');
  
  // Set property name
  var prop = (alias || name);
  
  // Register property in model
  this.properties[prop] = {type: 'array', default: []};
  
  // Register default property
  if (! this.__defaultProperties) self.__defaultProperties = {};
  this.__defaultProperties[prop] = [];

  // Get cname for get/set/remove operations
  var cname = inflect.camelize(alias || name),
      scname = inflect.singularize(cname);

  // Add function
  var addFunc = function(items, cb) {
    if (! (items instanceof Array)) items = [items];
    var diff = 0;
    for (var item,id,i=0; i < items.length; i++) {
      item = items[i];
      id = (item.id || item);
      if (this[prop].indexOf(id) === -1) {
        this[prop].push(id); diff++; // Only add item if not in array
      }
    }
    
    if (diff > 0 && cb instanceof Function) {
      this.save(cb);
    }
    
    return this;
  }
  
  // Get function
  var getFunc = function(items, cb) {
    if (! (items instanceof Array)) items = [items];
    var slf = this;
    
    for (var item,i=0; i < items.length; i++) {
      item = items[i];
      items[i] = (item && item.id || item);
    }
    
    model.get(items, function(e, m) {
      cb.call(slf, e, m);
    });
  }
  
  // Remove function
  var removeFunc = function(items, deep, cb) {
    var slf = this, diff = 0;
    
    if (!cb) { cb = deep; deep = false; }
    if (! (items instanceof Array)) items = [items];
    
    for (var item,found,id,i=0; i < items.length; i++) {
      item = items[i];
      id = items[i] = (item.id || item);
      found = arr.indexOf(id);
      if (found >= 0) {
        delete this[prop][found]; diff++;
      }
    }
    
    // Only filter if there have been changes
    if (diff > 0) this[prop] = this[prop].filter(function(x) { return x; }); // Remove undefined items
    
    if (diff === 0) {
      // No changes
      if (cb instanceof Function) cb.call(this, null);
    } else if (deep) {
      // Changes » Deep removal: Remove from db, then save model
      model.delete(items, function(modelErr) {
        if (cb instanceof Function) {
          slf.save(function(err) {
            if (modelErr && err) cb.call(this, [modelErr, err]);
            else cb.call(this, modelErr || err);
          });
        } else if (modelErr) {
          // No callback, log error if any
          self.app.log(modelErr);
        }
      });
    } else if (cb instanceof Function) {
      // Changes » Save if cb provided
      this.save(cb);
    }
    
    return this;
  }
  
  // add{Item}
  ModelObject.prototype['add' + scname] = function(item, cb) {
    if (item instanceof Array) {
      cb.call(this, new Error("%sObject::add%s only accepts a single id argument", self.className, scname));
    } else {
      // Call addFunc with single argument
      addFunc.call(this, item, cb);
    }
  }
  
  // add{Items}
  ModelObject.prototype['add' + cname] = addFunc;  // (items, cb)
  
  // get{Item}
  ModelObject.prototype['get' + scname] = function(item, cb) {
    if (item instanceof Array) {
      cb.call(this, new Error("%sObject::get%s only accepts a single id argument", self.className, scname));
    } else {
      // Call addFunc with single argument
      getFunc.call(this, item, cb);
    }
  }
  
  // get{Items}
  ModelObject.prototype['get' + cname] = getFunc;  // (items, cb)
  
  // remove{Item}
  ModelObject.prototype['remove' + scname] = function(item, cb) {
    if (item instanceof Array) {
      cb.call(this, new Error("%sObject::remove%s only accepts a single id argument", self.className, scname));
    } else {
      // Call addFunc with single argument
      removeFunc.call(this, item, cb);
    }
  }
  
  // remove{Items}
  ModelObject.prototype['remove' + cname] = function(items, cb) {
    removeFunc.call(this, items, cb);
  }
  
  // deepRemove{Item}
  ModelObject.prototype['deepRemove' + scname] = function(item, cb) {
    if (item instanceof Array) {
      cb.call(this, new Error("%sObject::deepRemove%s only accepts a single id argument", self.className, scname));
    } else {
      // Call addFunc with single argument
      removeFunc.call(this, item, true, cb);
    }
  }
  
  // deepRemove{Items}
  ModelObject.prototype['deepRemove' + cname] = function(items, cb) {
    removeFunc.call(this, items, true, cb);
  }

  // console.exit(ModelObject.prototype);

}

/**
  Sets a belongsTo relationship
  
  @param {string} name
  @param {string} prop
  @private
 */

function __belongsTo(name, prop) {
  
  var self = this,
      target = inflect.singularize(this.context),
      plural = inflect.pluralize(name);
  
  var model = this.app.models[plural];
  
  // Throw error if model not found
  if (!model) throw new Error(util.format("%s: Model not found for 'belongsTo' relationship: %s",
    this.className, plural));

  __hasOne.call(model, target, prop);
  
}

/**
  Sets a belongsToMany relationship
  
  @param {string} name
  @param {string} prop
  @private
 */
 
function __belongsToMany(name, prop) {

  var self = this,
      target = inflect.pluralize(this.context),
      plural = inflect.pluralize(name);
  
  var model = this.app.models[plural];
  
  // Throw error if model not found
  if (!model) throw new Error(util.format("%s: Model not found for 'belongsToMany' relationship: %s",
    this.className, plural));
    
  __hasMany.call(model, target, prop);

}

module.exports = Model;
