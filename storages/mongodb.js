
/* MongoStorage */

var _ = require('underscore'),
    util = require('util'),
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    ObjectID = mongodb.ObjectID;

function MongoStorage(app, config) {
  
  /** config: {
      host: 'localhost',
      port: 27017,
      database: 'store',
      collection: 'keyvalue'
      } */

   var self = this;
   
   config = corejs.extend({
     host: 'localhost',
     port: 27017,
     database: 'store',
     collection: 'keyvalue'
   }, config);
   
   this.app = app;
   this.config = config;
   this.className = this.constructor.name;
   
   corejs.async(app); // Register async queue
   
   var reportError = function(err) {
     app.log(util.format("MongoStore [%s:%s] %s", config.host, config.port, err.code));
     self.client = err;
     corejs.done(app); // Flush async queue
   }
   
   corejs.util.checkPort(config.port, function(err) {
     
     if (err) {
       reportError(err);
     } else {
       
       // Set db
       self.db = new Db(config.database, new Server(config.host, config.port, {}));
       
       // Get client
       self.db.open(function(err, client) {
         if (err) {
           reportError(err);
         } else {
           // Set client
           self.client = client;
            
           // Get collection
           client.collection(config.collection, function(err, collection) {
             
             // Set collection
             self.collection = collection;
             
             // Flush async queue
             corejs.done(app);
             
           });
           
         }
       });
       
     }
   });
   
   // Set enumerable properties
   corejs.util.onlySetEnumerable(this, ['className', 'db']);
}

util.inherits(MongoStorage, corejs.lib.storage);

MongoStorage.prototype.options = {};


/** Storage API get */

/*

  {key: 'hkey', value: {}}

*/

MongoStorage.prototype.get = function(key, callback) {
  var self = this;
  
  // If key is a string (return single value)
  if (typeof key == 'string') {
    
    self.collection.find({key: 'k'+ key}, {value: 1}, function(err, cursor) {
      cursor.toArray(function(err, docs) {
        if (err) callback.call(self, err);
        else {
          var doc = docs.shift();
          doc = (doc && doc.value) || null;
          callback.call(self, null, doc);
        }
      });
    });
    
  // If key is an array » return object with key/values
  } else if (key instanceof Array) {
      for (var doc, i=0; i < key.length; i++) {  
        key[i] = 'k' + key[i];
      }
      
      self.collection.find({key: {$in: key}}, {key: 1, value: 1, _id: 0}, function(err, cursor) {
        var out = {};
        cursor.toArray(function(err, docs) {
          if (err) callback.call(self, err);
          else {
            for (i=0; i < docs.length; i++) {
              doc = docs[i];
              out[doc.key.slice(1)] = doc.value;
            }
            callback.call(self, null, out);
          }
        });
      });
    
  }
}

/** Storage API getHash */

MongoStorage.prototype.getHash = function(key, callback) {
  var self = this;
  
  self.collection.find({key: 'h'+key}, function(err, cursor) {
    cursor.toArray(function(err, docs) {
      if (err) callback.call(self, err);
      else {
        var doc = docs.shift();
        doc = (doc && doc.value) || null;
        callback.call(self, null, doc);
      }
    });
  });
  
}

/** Storage API set */

MongoStorage.prototype.set = function(key, value, callback) {
  var app = this.app,
      self = this;
  
  // If key is a string » Sets a single value
  if (typeof key == 'string') {
    
    var _key = 'k' + key;
    
    this.collection.find({key: _key}, {_id: 1}, function(err, cursor) {
      cursor.toArray(function(err, docs) {
        if (err) callback.call(self, err);
        else {
          var doc = docs.shift();
          if (doc) {
            app.debug('MongoStore::set: replacing existing data on key: ' + _key);
            self.collection.update(doc, {
              key: _key,
              value: value
            }, function(err, doc) {
              // console.exit(doc);
              callback.call(self, err || null);
            });
          } else {
            app.debug('MongoStore::set: inserting new data on key: ' + _key);
            self.collection.insert({
              key: _key,
              value: value
            }, function(err, doc) {
              // console.exit(doc);
              callback.call(self, err || null);
            });
          }
        }
      });
    });
    
  // If key is an array » Sets multiple values
  } else if (key.constructor === Object) {
    
    callback = value;
    
    var keys = Object.keys(key),
        multi = this.multi();
        
    for (var k, i=0; i < keys.length; i++) {
      k = keys[i];
      multi.set(k, key[k]);
    }
    
    multi.exec(function(err, results) {
      // console.exit(results);
      callback.call(self, err || null);
    });
    
  }
}

/** Storage API setHash */

MongoStorage.prototype.setHash = function(key, object, callback) {
  var app = this.app,
      self = this,
      _key = 'h' + key;
      
  app.debugLog = true;
  
  self.collection.find({key: _key}, {_id: 1}, function(err, cursor) {
    cursor.toArray(function(err, docs) {
      if (err) callback.call(self, err);
      else {
        var doc = docs.shift();
        if (doc) {
          app.debug('MongoStore::set: replacing existing data on hash: ' + _key);
          self.collection.update(doc, {
            key: _key,
            value: object
          }, function(err, doc) {
            // console.exit(doc);
            callback.call(self, err || null);
          });
        } else {
          app.debug('MongoStore::set: inserting new data on hash: ' + _key);
          self.collection.insert({
            key: _key,
            value: object
          }, function(err, doc) {
            // console.exit(doc);
            callback.call(self, err || null);
          });
        }
      }
    });
  });
  
}

/** Storage API updateHash */

MongoStorage.prototype.updateHash = function(key, object, callback) {
  var self = this,
      _key = 'h' + key;
  
  self.collection.find({key: _key}, {_id: 1, value: 1}, function(err, cursor) {
    cursor.toArray(function(err, docs) {
      var doc = docs.shift();
      if (doc) {
        var newData = _.extend(doc.value, object);
        self.collection.update({_id: doc._id}, {
          key: _key,
          value: newData
        }, function(err) {
          callback.call(self, err || null);
        });
      } else {
        callback.call(self, null);
      }
    });
  });
  
}

/** Storage API deleteFromHash */

MongoStorage.prototype.deleteFromHash = function(hash, key, callback) {
  var self = this,
      _key = 'h' + hash;
  
  self.collection.find({key: _key}, function(err, cursor) {
    if (err) callback.call(self, err);
    else {
      cursor.toArray(function(err, docs) {
        var doc = docs.shift();
        doc = (doc && doc.value) || null;
        if (doc) {
          if (key in doc) {
            delete doc[key];
            self.collection.update({key: _key},{
              key: _key,
              value: doc
            }, function(err) {
              callback.call(self, err || null);
            });
          } else {
            // Key not in doc
            callback.call(self, null);
          }
        } else {
          // Doc not found
          callback.call(self, null);
        }
      });
    }
  });
}

/** Storage API delete */

MongoStorage.prototype.delete = function(key, callback) {
  var self = this,
      keys = (typeof key == 'string') ? [key] : key,
      inArr = [];
  
  for (var i=0; i < keys.length; i++) {
    key = keys[i];
    inArr.push('k'+key); // Regular key
    inArr.push('h'+key); // Hash key
  }
  
  self.collection.remove({
    key: {$in: inArr}
  }, function(err) {
    callback.call(self, err || null);
  });

}

/** Storage API rename */

MongoStorage.prototype.rename = function(oldkey, newkey, callback) {
  var self = this;
  
  // Get key
  this.get(oldkey, function(err, val) {
    if (err) callback.call(self, err);
    else {
      var prefix = (val != null) ? 'k' : 'h';
      self.collection.update({key: prefix + oldkey}, {
        $set: {key: prefix + newkey}
      }, function(err) {
        callback.call(self, err || null);
      });
    }
  });
}

/** Storage API expire */

MongoStorage.prototype.expire = function(key, timeout, callback) {
  callback.call(this, new Error("MongoStorage: MongoDB does not support key expiration"));
}
  
module.exports = MongoStorage;
