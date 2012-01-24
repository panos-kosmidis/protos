
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    RedisClient = require('redis').RedisClient,
    EventEmitter = require('events').EventEmitter;
    
var redis, multi;

/*
  Storage API Check Order:
  
  set
  
  get
  rename
  setHash
  getHash
  updateHash
  deleteFromHash
  delete
  expire

*/

vows.describe('lib/storages/redis.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = new EventEmitter();
      app.on('init', function() {
        redis = app.getResource('storages/redis');
        multi = redis.multi({parallel: false, interrupt: false});
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
        promise.emit('success', results);
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
  
  /*
    Retrieves one or more records from the storage backend

    a) If a key is a string: provides [err, value]
    b) If a key is an array: provides [err, results] 

    @param {string|array} key
    @param {function} callback
    @public
  */
  
  'RedisStorage::get': {
    
    topic: function() {
      var promise = new EventEmitter();
      // multi = redis.multi();
      multi.get('v1');
      multi.get(['v2', 'v3']);
      multi.exec(function(err, results) {
        console.exit(results);
        promise.emit('success', results);
      });
      return promise;
    },
    
    'Retrieves a single value': function(results) {
      
    },
    
  }
  
}).export(module);