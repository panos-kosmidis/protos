
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var multi = app.createMulti(app, {flush: false});

vows.describe('Response Caching').addBatch({
  
  'When Caching enabled': {
    
    topic: function() {
      var promise = new EventEmitter();

      app.enable('response_cache', 'redis');
      app.config.rawViews = true;
      
      var cacheStore = app.getResource('response_cache');
      
      // Backup filters
      app.__filtersBackup = app.__filters;
      app.__filters = {};
      
      // Requests that will be cached
      multi.curl('/test/response-cache/1');
      multi.curl('/test/response-cache/2');
      
      // Requests that won't be cached
      multi.curl('/test/response-nocache/3');
      multi.curl('/test/response-nocache/4');

      multi.exec(function(err, results) {
        // Cache will be deleted on next `exec`
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Responses are cached properly when using res.useCache': function(results) {
      // First request should cache the response and return
      assert.equal(results[0], 'RESPONSE ID: 1');
      // If the request was successfully cached, 
      // The second request should return 1, instead of 2
      assert.equal(results[1], 'RESPONSE ID: 1');
    },
    
    'Responses are not cached when not using res.useCache': function(results) {
      // The third & fourth requests should not cache anything
      assert.equal(results[2], 'RESPONSE ID: 3');
      assert.equal(results[3], 'RESPONSE ID: 4');
    }
    
  }
  
}).addBatch({
  
  'When Caching disabled': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Disable response caching
      var cacheStore = (app.supports.response_cache && app.resources.response_cache);
      delete app.supports.response_cache;
      delete app.resources.response_cache;
      
      multi.exec(function(err, results) {
        // Remove the cache key after test completed
        cacheStore.delete('my_cache', function(e) {
          if (e) throw e;
          else {
            app.rawViews = false;
            app.__filters = app.__filtersBackup;
            promise.emit('success', err || results);
          }
        });        
        
      });
      
      return promise;
    },
    
    'Responses ignore res.useCache': function(results) {
      assert.equal(results[0], 'RESPONSE ID: 1');
      assert.equal(results[1], 'RESPONSE ID: 2');
      assert.equal(results[2], 'RESPONSE ID: 3');
      assert.equal(results[3], 'RESPONSE ID: 4');
    }
    
  }
  
}).export(module);
