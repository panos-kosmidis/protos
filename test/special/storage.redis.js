
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    RedisClient = require('redis').RedisClient,
    EventEmitter = require('events').EventEmitter;
    
vows.describe('lib/storages/redis.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = app.promise = new EventEmitter();
      app.on('init', function() {
        var redis = app.getResource('storages/redis');
        promise.emit('success', redis);
      });
      return promise;
    },

    'Sets db': function(redis) {
      assert.isNumber(redis.db);
    },
    
    'Sets config': function(redis) {
      assert.strictEqual(redis.config.host, app.config.storage.redis.host)
    },
    
    'Sets client': function(redis) {
      assert.instanceOf(redis.client, RedisClient);
    }
    
  }
  
}).export(module);