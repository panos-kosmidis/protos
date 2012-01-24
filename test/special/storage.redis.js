
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
  
  /**
    Inserts one or more records into the storage backend

    Provides: [err]

    Key can be either a string or an object containing key/value pairs

    @param {string|object} key
    @param {string} value (optional)
    @param {function} callback
   */  
  
  'RedisStorage::set': {
    
    topic: function() {
      var promise = new EventEmitter()
      multi.set('v1', 'Value 1');
      multi.set({v2: 'Value 2', v3: 'Value 3'});
      multi.exec(function(err, results) {
        promise.emit('success', results);
      });
      return promise;
    },
    
    'Sets a single value': function(results) {
      assert.strictEqual(results[0], 'OK');
    },
    
    'Sets multiple values': function(results) {
      assert.strictEqual(results[1], 'OK');
    }
    
  }
  
}).export(module);