
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');
    
vows.describe('lib/storages/redis.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      return app.getResource('storages/redis');
    },
    
    'Sets config': function(redis) {
      assert.isObject(redis.config);
    }
    
  }
  
}).export(module);