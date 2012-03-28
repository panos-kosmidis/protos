
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

vows.describe('Request Misc').addBatch({
  
  'Page Title': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      // Page title, default
      multi.curl("/request/title");
      
      // Specific Page Title
      multi.curl('-G -d "msg=Hello%20World" /request/title');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    "Sets default page title": function(results) {
      var r = results[0];
      assert.equal(r, '{My Application}');
    },
    
    "Sets custom page title": function(results) {
      var r = results[1];
      assert.equal(r, '{My Application &raquo; Hello World}');
    }
    
  }
  
}).export(module);
