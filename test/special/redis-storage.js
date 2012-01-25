
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    RedisClient = require('redis').RedisClient,
    EventEmitter = require('events').EventEmitter;
    
var redis, multi;

vows.describe('lib/storages/redis.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = new EventEmitter();
      app.getResource('storages/redis', function(storage) {
        redis = storage;
        multi = redis.multi();
        promise.emit('success');
      });
      return promise;
    },

    'Sets db': function() {
      assert.isNumber(redis.db);
    },
    
    'Sets config': function() {
      assert.strictEqual(redis.config.host, app.config.storage.redis.host);
    },
    
    'Sets client': function() {
      assert.instanceOf(redis.client, RedisClient);
    }
    
  }
  
}).addBatch({
  
  'RedisStorage::set': {
    
    topic: function() {
      var promise = new EventEmitter()
      multi.set('v1', 'Value 1'); // Single value
      multi.set({v2: 'Value 2', v3: 'Value 3'}); // Multiple Values
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      return promise;
    },
    
    'Stores a single value': function(results) {
      assert.strictEqual(results[0], 'OK');
    },
    
    'Stores multiple values': function(results) {
      assert.strictEqual(results[1], 'OK');
    }
    
  }
  
}).addBatch({
  
  'RedisStorage::get': {
    
    topic: function() {
      var promise = new EventEmitter();
      // multi = redis.multi();
      multi.get('v1');
      multi.get(['v2', 'v3']);
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      return promise;
    },
    
    'Retrieves a single value': function(results) {
      assert.strictEqual(results[0], 'Value 1');
    },
    
    'Retrieves multiple values': function(results) {
      assert.deepEqual(results[1], {v2: 'Value 2', v3: 'Value 3'});
    }
    
  }
  
}).addBatch({
  
  'RedisStorage::delete': {
    
    topic: function() {
      var promise = new EventEmitter();
      multi.set('delete_me', true);
      multi.set({d1: 1, d2: 2, d3: 3});
      multi.delete('delete_me');
      multi.delete(['d1', 'd2', 'd3']);
      multi.get(['delete_me', 'd1', 'd2', 'd3']);
      multi.exec(function(err, results) {
        promise.emit('success', err || results.pop()); // Last result (get)
      });
      return promise;
    },
    
    'Deletes a single key': function(results) {
      var keyExists = Object.hasOwnProperty.call(results, 'delete_me');
      assert.isTrue(keyExists && results.delete_me === null);
      delete results.delete_me;
    },
    
    'Deletes multiple keys': function(results) {
      assert.deepEqual(results, {d1: null, d2: null, d3: null});
    }
    
  }
  
}).addBatch({
  
  'RedisStorage::rename': {

    topic: function() {
      var res, promise = new EventEmitter();
      multi.rename('v1', 'v1_new');
      multi.get('v1_new');
      multi.rename('v1_new', 'v1');
      multi.exec(function(err, results) {
        res = err || (results[1] === 'Value 1');
        promise.emit('success', res);
      });
      return promise;
    },
    
    'Renames keys': function(topic) {
      assert.isTrue(topic);
    }

  }
  
}).addBatch({
  
  'RedisStorage::setHash': {
    
    topic: function() {
      var promise = new EventEmitter();
      multi.delete('myhash');
      multi.setHash('myhash', {a:1, b:2, c:3});
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      })
      return promise;
    },
    
    'Stores hash values': function(results) {
      assert.equal(results[1], 'OK');
    }
    
  }
  
}).addBatch({
  
  'RedisStorage::getHash': {
    
    topic: function() {
      var promise = new EventEmitter();
      redis.getHash('myhash', function(err, hash) {
        promise.emit('success', err || hash);
      });
      return promise;
    },
    
    'Retrieves hash values': function(hash) {
      assert.deepEqual(hash, {a:1, b:2, c:3});
    }
    
  }
  
}).addBatch({
  
  'RedisStorage::updateHash': {
    
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
  
}).addBatch({
  
  'RedisStorage::deleteFromHash': {
    
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
  
}).addBatch({
  
  'RedisStorage::expire': {
    
    topic: function() {
      var promise = new EventEmitter();
      redis.expire('v1', 60, function(err) {
        if (err) promise.emit('success', err);
        else {
          redis.client.ttl('v1', function(err, result) {
            promise.emit('success', err || result);
          });
        }
      });
      return promise;
    },
    
    'Deletes keys on expiration time': function(topic) {
      assert.isTrue(topic !== -1);
    }
    
  }
  
}).export(module);
