
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

var multi = app.createMulti(app);

vows.describe('View Engines').addBatch({
  
  'Eco': {
    
    topic: function() {
      var promise = new EventEmitter();
      app.clientRequest('/eco.eco', function(err, buffer, headers) {
        promise.emit('success', err || {buffer: buffer, headers: headers});
      });
      return promise;
    },
    
    'Returns valid view buffer': function(results) {
      console.exit(results.buffer);
    }
    
  }
  
}).export(module);