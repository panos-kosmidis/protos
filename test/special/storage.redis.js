
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
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

    'Is true': function(redis) {
      console.exit(redis.get);
    }
    
  }
  
}).export(module);