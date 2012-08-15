
var assert = require('assert'),
    colorize = protos.util.colorize,
    EventEmitter = require('events').EventEmitter;

function StorageBatch(stoClass) {
  
  var storage, multi, self = this;
  
  var instance = {
    set: {},
    get: {},
    delete: {},
    rename: {},
    setHash: {},
    getHash: {},
    updateHash: {},
    deleteFromHash: {},
    expire: {},
    incr: {},
    incrBy: {},
    decr: {},
    decrBy: {}
  };
  
  instance.set[stoClass + '::set'] = {

    // Set
    topic: function() {
      var promise = new EventEmitter();
      
      multi.set('v1', 'Value 1'); // Single value
      multi.set({v2: 'Value 2', v3: 'Value 3'}); // Multiple Values
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    'Stores single/multiple values': function(results) {
      assert.deepEqual(results, [ 'OK', 'OK' ]);
    }

  }
  
  // Get
  instance.get[stoClass + '::get'] = {

    topic: function() {
      var promise = new EventEmitter();
      
      multi.get('v1');
      multi.get(['v2', 'v3']);
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    'Retrieves single/multiple values': function(results) {
      var expected = [ 'Value 1', { v2: 'Value 2', v3: 'Value 3' } ];
      assert.deepEqual(results, expected);
    }

  }
  
  // Delete
  instance.delete[stoClass + '::delete'] = {

    topic: function() {
      var promise = new EventEmitter();
      
      multi.set('delete_me', true);
      multi.set({d1: 1, d2: 2, d3: 3});
      multi.delete('delete_me');
      multi.delete(['d1', 'd2', 'd3']);
      multi.get(['delete_me', 'd1', 'd2', 'd3']);
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    'Deletes single/multiple keys': function(results) {
      var expected = [ 'OK', 'OK', 'OK', 'OK' ];
      assert.deepEqual(results.slice(0,4), expected);
    }

  }
  
  // Rename
  instance.rename[stoClass + '::rename'] = {

    topic: function() {
      var res, promise = new EventEmitter();
      
      multi.rename('v1', 'v1_new');
      multi.get('v1_new');
      multi.rename('v1_new', 'v1');
      
      multi.exec(function(err, results) {
        res = err || (results[1] == 'Value 1');
        promise.emit('success', res);
      });
      
      return promise;
    },

    'Properly renames keys': function(topic) {
      assert.isTrue(topic);
    }

  }

  // setHash
  instance.setHash[stoClass + '::setHash'] = {

    topic: function() {
      var promise = new EventEmitter();
      
      multi.delete('myhash');
      multi.setHash('myhash', {a:1, b:2, c:3});
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    'Properly stores hash values': function(results) {
      assert.equal(results[1], 'OK');
    }

  }

  // getHash
  instance.getHash[stoClass + '::getHash'] = {

    topic: function() {
      var promise = new EventEmitter();

      storage.getHash('myhash', function(err, hash) {
        promise.emit('success', err || hash);
      });

      return promise;
    },

    'Properly retrieves hash values': function(hash) {
      assert.deepEqual(hash, {a:1, b:2, c:3});
    }

  }
  
  // updateHash
  instance.updateHash[stoClass + '::updateHash'] = {

    topic: function() {
      var promise = new EventEmitter();
      
      multi.updateHash('myhash', {a: 97, b:98, c:99});
      multi.getHash('myhash');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results[1]);
      });
      
      return promise;
    },

    "Updates values in hash": function(hash) {
      assert.deepEqual(hash, {a: 97, b: 98, c: 99});
    }

  }
  
  // deleteFromHash
  instance.deleteFromHash[stoClass + '::deleteFromHash'] = {

    topic: function() {
      var promise = new EventEmitter();
      
      multi.deleteFromHash('myhash', 'c');
      multi.getHash('myhash');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    'Deletes values from hash': function(results) {
      assert.deepEqual(results[1], {a: 97, b: 98});
    }

  }
  
  // Expire
  instance.expire[stoClass + '::expire'] = {

    topic: function() {
      var promise = new EventEmitter();
      
      storage.expire('v1', 60, function(err) {
        promise.emit('success', err);
      });
      
      return promise;
    },

    'Deletes keys on expiration time (if db supports ttl)': function(err) {
      assert.isNull(err);
    }

  }
  
  // Incr
  instance.incr[stoClass + '::incr'] = {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.set('hello', 100);
      multi.incr('hello');
      multi.incr('hello');
      multi.get('hello');

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },
    
    "Increments key by one": function(results) {
      assert.equal(results.pop(), 102);
    }
    
  }
  
  // IncrBy
  instance.incrBy[stoClass + '::incrBy'] = {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.set('hello', 100);
      multi.incrBy('hello', 5);
      multi.incrBy('hello', 5);
      multi.get('hello');

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },
    
    "Increments key by value": function(results) {
      assert.equal(results.pop(), 110);
    }
    
  }
  
  // Decr
  instance.decr[stoClass + '::decr'] = {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.set('hello', 100);
      multi.decr('hello');
      multi.decr('hello');
      multi.get('hello');

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },
    
    "Decrements key by one": function(results) {
      assert.deepEqual(results.pop(), 98);
    }
    
  }
  
  // IncrBy
  instance.decrBy[stoClass + '::decrBy'] = {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.set('hello', 100);
      multi.decrBy('hello', 2);
      multi.decrBy('hello', 2);
      multi.get('hello');

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },
    
    "Decrements keys by value": function(results) {
      assert.equal(results.pop(), 96);
    }
    
  }
  
  // Defining a `model` setter, to prevent conflicts with vows
  instance.__defineSetter__('storage', function(s) {
    storage = s;
    multi = storage.multi();
  });
  
  // Attach to current batch
  instance.forEach = function(callback) {
    var keys = Object.keys(this);
    for (var test, i=0; i < keys.length; i++) {
      var key = keys[i],
          item = this[key];
      if (typeof item == 'object') callback(item);
    }
  }
  
  return instance;
}

module.exports = StorageBatch;
