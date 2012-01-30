
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);
    
vows.describe('Response Misc').addBatch({
  
  'Headers': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      app.config.rawViews = false;
      app.__filterBackup = app.__filters;
      app.__filters = {};
      
      app.clientRequest('/', function(err, res, headers) {
        app.__filters = app.__filterBackup;
        promise.emit('success', err || headers);
      });
      
      return promise;
    },

    'Are properly sent': function(headers) {
      var expected = Object.keys(app.config.headers).map(function(elem) {
        return elem.toLowerCase();
      }).concat(['cache-control', 'connection', 'transfer-encoding']).sort();
      assert.deepEqual(Object.keys(headers).sort(), expected);
    },
    
    'Dynamic headers work properly': function(headers) {
      assert.isFalse(isNaN(Date.parse(headers.date)));
      assert.equal(headers.status, '200 OK');
    },
    
  }
  
}).addBatch({
  
  'Cookie Operations': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.curl('/setcookie/user/ernie'); // setCookie
      multi.curl('/removecookie/user'); // removeCookie
      multi.curl('/removecookies/user-email-info'); // removeCookies
      multi.curl('/hascookie/user'); // hasCookie
      multi.curl('/getcookie/user'); // getCookie
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
  
      return promise;
    },
    
    'Cookies are correctly set': function(results) {
      console.exit(results);
    }
    
  }
  
}).export(module);
