
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var multi = app.createMulti();

vows.describe('Response Caching').addBatch({
  
  'When caching enabled': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      app.config.rawViews = true;
      
      // Requests that will be cached
      multi.curl('/test/response-cache/1');
      multi.curl('/test/response-cache/2');
      
      // Requests that won't be cached
      multi.curl('/test/response-nocache/3');
      multi.curl('/test/response-nocache/4');

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      // return promise;
    },
    
    'success': function(results) {
      // console.exit(results);
    }
    
  }
  
}).export(module);