
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);
    
vows.describe('Response Misc').addBatch({
  
  'Sending Headers': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      app.config.rawViews = false;
      app.__filterBackup = app.__filters;
      app.__filters = {};
      
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
  
  
  'Cookie Operations': {
    
    topic: function() {
      var promise = new EventEmitter();

      // OutgoingMessage::setCookie
      multi.curl('-i /setcookie/user/john');
      multi.curl('-i -G -d "domain=example.com" /setcookie/user/john');
      multi.curl('-i -G -d "domain=example.com&path=/test&expires=3600" /setcookie/user/john');
      multi.curl('-i -G -d "domain=example.com&path=/test&expires=3600&httpOnly=1" /setcookie/user/john');
      multi.curl('-i -G -d "domain=example.com&path=/test&expires=3600&httpOnly=1&secure=1" /setcookie/user/john');
      
      // OutgoingMessage::removeCookie
      multi.curl('-i /removecookie/user');
      
      // OutgoingMessage::removeCookies
      multi.curl('-i /removecookies/user-email-info');
      
      // OutgoingMessage::hasCookie
      multi.curl('--cookie "user=john" /hascookie/user');
      
      // OutgoingMessage::getCookie
      multi.curl('--cookie "id=24" /getcookie/id');
      
      multi.exec(function(err, results) {
        app.__filters = app.__filterBackup;
        promise.emit('success', err || results.map(function(r) {
          return r.trim().split(/\r\n/);
        }));
      });
  
      return promise;
    },
    
    'OutgoingMessage::setCookie works w/o options': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('Set-Cookie: user=john; path=/') >= 0);
    },
    
    'OutgoingMessage::setCookie works w/domain': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('Set-Cookie: user=john; domain=example.com; path=/') >= 0)
    },
    
    'OutgoingMessage::setCookie works w/domain + path': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('Set-Cookie: user=john; domain=example.com; path=/test') >= 0)
    },
    
    'OutgoingMessage::setCookie works w/domain + path + httpOnly': function(results) {
      var r = results[3];
      assert.isTrue(r.indexOf('Set-Cookie: user=john; domain=example.com; path=/test; httpOnly') >= 0)
    },
    
    'OutgoingMessage::setCookie works w/domain + path + httpOnly + secure': function(results) {
      var r = results[4];
      assert.isTrue(r.indexOf('Set-Cookie: user=john; domain=example.com; path=/test; httpOnly; secure') >= 0)
    },
    
    'OutgoingMessage::removeCookie works properly': function(results) {
      var res = results[5]; // 'Set-Cookie: user=null; path=/; expires=Tue, 31 Jan 2012 01:41:45 GMT
      
      for (var r, i=0; i < res.length; i++) {
        r = res[i];
        if (r.indexOf('Set-Cookie: user=null; path=/; expires=') === 0) break;
      }
     
      var date = Date.parse(r.split('=').pop());
      var expired = date < Date.now();
      
      assert.isFalse(isNaN(date));
      assert.isTrue(expired);
    },
    
    'OutgoingMessage::removeCookies works properly': function(results) {
      var r = results[6], // 'Set-Cookie: user=null; path=/; expires=Tue, 31 Jan 2012 01:41:45 GMT'
          cookies = ['user', 'email', 'info'],
          cRegex = /^Set\-Cookie: (user|email|info)=null; path=\/; expires=/;
      
      r.map(function(h) {
        var match = h.match(cRegex);
        if (match) {
          assert.isTrue(cookies.indexOf(match[1]) >= 0);
          var date = Date.parse(h.split('=').pop());
          var expired = date < Date.now();
          assert.isFalse(isNaN(date));
          assert.isTrue(expired);
        }
      });
    },
    
    'OutgoingMessage::hasCookie detects cookie': function(results) {
      var r = results[7];
      assert.deepEqual(r, ['YES']);
    },
    
    'OutgoingMessage::getCookie retrieves cookie value': function(results) {
      var r = results[8];
      assert.deepEqual(r, ['24']);
    },
    
  }
  
}).export(module);
