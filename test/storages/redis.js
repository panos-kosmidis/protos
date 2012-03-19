
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    StorageBatch = require('../fixtures/storage-batch'),
    EventEmitter = require('events').EventEmitter;

var redisStore;

var storageBatch = new StorageBatch('RedisStorage');

var batch = vows.describe('storages/redis.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = new EventEmitter();
      app._getResource('storages/redis', function(storage) {
        redisStore = storage;
        storageBatch.storage = storage;
        promise.emit('success', storage);
      });
      return promise;
    },

    'Created storage instance': function(storage) {
      assert.equal(storage.className, 'RedisStorage');
      assert.instanceOf(storage, protos.lib.storage);
    }
    
  }
  
});

// Storage API Tests
storageBatch.forEach(function(test) {
  batch = batch.addBatch(test);
});

batch.export(module);
