
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

vows.describe('Response Misc').addBatch({
  
  'Sending Headers': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      app.config.rawViews = false;
      
      multi.clientRequest('/');
      multi.curl('-i -G -d "x-custom-header=1&x-another-header=2&x-some-header=3" /setheaders');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },

    'Headers are properly sent in the response': function(results) {
      var buf = results[0][0],
          headers = results[0][1];
      var expected = Object.keys(app.config.headers).map(function(elem) {
        return elem.toLowerCase();
      }).concat(['cache-control', 'connection', 'transfer-encoding']).sort();
      assert.deepEqual(Object.keys(headers).sort(), expected);
    },
    
    'Dynamic headers work according to function': function(results) {
      var buf = results[0][0],
          headers = results[0][1];
      assert.isFalse(isNaN(Date.parse(headers.date)));
      assert.equal(headers.status, '200 OK');
    },
    
    'OutgoingMessage::setHeaders works properly': function(results) {
      var headers = results[1].trim().split(/\r\n/);
      assert.isTrue(headers.indexOf('x-custom-header: 1') >= 0);
      assert.isTrue(headers.indexOf('x-another-header: 2') >= 0);
      assert.isTrue(headers.indexOf('x-some-header: 3') >= 0);
    }
    
  }
  
}).addBatch({
  
  'Cache Control': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      multi.curl('-i /'); // Dynamic
      multi.curl('-i /robots.txt'); // Static
      multi.curl('-i /404'); // Error
      
      multi.exec(function(err, results) {
        results = results.map(function(r) {
          r = r.trim().split(/\r\n/g);
          r = r.slice(0, r.indexOf(''))
          return r;
        });
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Properly set for dynamic resources': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('Cache-Control: ' + app.config.cacheControl.dynamic) >= 0);
    },
    
    'Properly set for static resources': function(results) {
      var r = results[1];
      var cc = app.config.cacheControl;
      assert.isTrue(r.indexOf(util.format('Cache-Control: %s, max-age=%d', cc.static, cc.maxAge)) >= 0);
    },
    
    'Properly set for error pages': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('Cache-Control: ' + app.config.cacheControl.error) >= 0);
    }
    
  }
  
}).addBatch({
  
  'Redirection': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      multi.curl('-i /redirect/test');
      multi.curl('-i /redirect/home');
      multi.curl('-i /redirect/login');
      
      multi.exec(function(err, results) {
        results = results.map(function(r) {
          return r.trim().split(/\r\n/);
        });
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'OutgoingMessage::redirect works properly': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('Location: ' + app.url('/test')) >= 0);
    },
    
    'Application::home redirects properly': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('Location: ' + app.url('/')) >= 0);
    },
    
    'Application::login redirects properly': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('Location: ' + app.url(app.loginUrl)) >= 0);
    }
    
  }
  
}).addBatch({
  
  'Redirection (unauthorized)': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      var login = app.loginUrl;
      app.loginUrl = null;
      
      app.curl('-i /redirect/login', function(err, buf) {
        app.loginUrl = login;
        promise.emit('success', err || buf);
      });
      
      return promise;
    },
    
    'Application::login responds w/401 when app.loginUrl is null': function(results) {
      var r = results;
      assert.isTrue(r.indexOf('HTTP/1.1 401 Unauthorized') >= 0);
    }
    
  }
  
}).export(module);
