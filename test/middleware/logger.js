
var app = require('../fixtures/bootstrap'),
    fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var logging = app.logging;

vows.describe('Logger (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      // Create empty log files
      fs.writeFileSync(app.fullPath('log/access.log'), '');
      fs.writeFileSync(app.fullPath('log/info.log'), '');
      fs.writeFileSync(app.fullPath('log/error.log'), '');

      // Enable logger
      app.logging = false;
      app.use('logger', {accessLogConsole: false});

      var promise = new EventEmitter();

      // Info logs
      app.log('Hello World!');

      // Error logs
      app.log(new Error('This is an error!'));

      // Access logger
      app.curl('-i /testing/the/logger/middleware', function(err, results) {
        app.logging = logging;
        delete app._events.info_log;
        delete app._events.error_log;
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Successfully stores info logs": function() {
      var buf = fs.readFileSync(app.fullPath('log/info.log'), 'utf8');
      assert.isTrue(buf.indexOf('Hello World!') >= 0);
      assert.equal(buf.trim().split('\n').length, 1); // check number of lines in log
    },

    "Successfully stores error logs": function() {
      var buf = fs.readFileSync(app.fullPath('log/error.log'), 'utf8');
      assert.isTrue(buf.indexOf('Error: This is an error!') >= 0);
      assert.equal(buf.trim().split('\n').length, 8); // check number of lines in log (stack trace)
    },
    
    "Successfully stores access logs": function(r) {
      var buf = fs.readFileSync(app.fullPath('log/access.log'), 'utf8');
      assert.isTrue(r.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(buf.indexOf('GET /testing/the/logger/middleware 404') >= 0);
      assert.equal(buf.trim().split('\n').length, 1); // check number of lines in log
    }
    
  }
  
}).export(module);