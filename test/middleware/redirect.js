
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var events = app._events,
    multi = new Multi(app); 
    
vows.describe('Redirect (middleware)').addBatch({
  
  '': {

    topic: function() {
      
      var promise = new EventEmitter();
      // Temporarily disable app events
      app._events = [];
      
      // Enable the redirect middleware
      app.use('redirect', 'http://corejs.org');

      // Request to home
      multi.curl('-i /');
      
      // Request to inexistent resource
      multi.curl('-i /404');
      
      // Request with invalid methods
      multi.curl('-i -X PUT /');
      
      // Request with invalid method and inexistent resource
      multi.curl('-i -X POST /404');
      
      multi.exec(function(err, results) {
        // Restore events
        app._events = events;
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    "Properly redirects regardless any URL": function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.isTrue(r1.indexOf('HTTP/1.1 302 Moved Temporarily') >= 0);
      assert.isTrue(r1.indexOf('Location: http://corejs.org') >= 0);
      assert.isTrue(r1.indexOf('Connection: close') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 302 Moved Temporarily') >= 0);
      assert.isTrue(r2.indexOf('Location: http://corejs.org') >= 0);
      assert.isTrue(r2.indexOf('Connection: close') >= 0);
    },
    
    "Responds w/400 on invalid requests": function(results) {
      var r1 = results[2],
          r2 = results[3];
      assert.isTrue(r1.indexOf('HTTP/1.1 400 Bad Request') >= 0);
      assert.isTrue(r1.indexOf('Connection: close') >= 0);
      assert.equal(r1.indexOf('Location: http://corejs.org'), -1);
      assert.isTrue(r2.indexOf('HTTP/1.1 400 Bad Request') >= 0);
      assert.isTrue(r2.indexOf('Connection: close') >= 0);
      assert.equal(r2.indexOf('Location: http://corejs.org'), -1);
    }
    
  }
  
}).export(module);