
/* Model */

var _ = require('underscore'),
    _s = require('underscore.string'),
    util = require('util'),
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
    return ! isNaN(Date.parse(date));
  }
};

/**
  Prepares the model and its low level configuration
  
  @param {object} app
 */

Model.prototype.prepare = function(app) {
  // Exit if drivers are not ready yet
  if (typeof app == 'undefined' || typeof app.drivers.default == 'undefined') return;
  
  var name, validation;
  this.app = app;
  name = this.driver = (this.driver || app.config.database.default);

  // Get driver
  if (typeof this.driver == 'string') {
    this.driver = app.getResource('drivers/' + this.driver);
  } else if (! this.driver instanceof corejs.lib.driver) {
    throw new Error(util.format("Driver config not found: '%s'", name));
  }

  // Extend validation
  validation = _.extend({}, this.validation);
  this.validation = _.extend(validation, this.validation || {});    
  
  // Default properties
  this.__defaultProperties = {};
  
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
  
  // Set classname
  this.className = this.constructor.name;
  
  // Set context
  this.context = getContext(this.className);
  
  // ModelObject prototype
  this.modelObjectProto = new (createModelObject.call(this));
  
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
    if (key == 'id' || typeof val != 'string') continue;
    
    type = properties[key].type;
    
    // Type coercions
    // Defined in property `type` definitions
    
    switch (type) {
      case 'string': break;
      
      case 'integer':
        o[key] = parseInt(val, 10);
        break;
        
      case 'boolean':
        val = val.trim().toLowerCase();
        if (boolRegex.test(val) || bynaryRegex.test(val)) {
          o[key] = (val == 'true' || val == '1');
        } else {
          o[key] = new Error(invalidData);
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
    descriptor[key] = {value: o[key], writable: true, enumerable: true, configurable: true};
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
    this.className = self.className + 'Object';
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
    
    console.exit(update);
    
    // No changes
    if (diff === 0) { callback.call(self, null); return; }
    
    // Validate data prior to sending to the driver
    err = generator.validateProperties(update, {noRequired: true, returnErrors: true});
    
    if (err) callback.call(this, err);
    else {
      // Perform driver save
      update.id = this.__currentState.id;
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

    var id = this.__currentState.id,
        self = this,
        generator = this.generator;
    
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }
    
    generator.delete(id, cdata, function(err) {
      generator.emit('delete', err, self);
      callback.call(self, err);
    });
    
  }
  
  ModelObject.prototype.destroy = ModelObject.prototype.delete; // alias
  
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

module.exports = Model;
