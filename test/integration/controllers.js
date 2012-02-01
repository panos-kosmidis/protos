
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app, {throwErrors: true}),
    controllerCtor = app.controller.constructor,
    restMethods = app.otherMethods;
    
// Automatically add requets url in headers (for debugging purposes)
app.config.headers['X-Request-Url'] = function(req, res) {
  return req.url;
}

// Automatically add request method in headers (for debugging purposes)
app.config.headers['X-Request-Method'] = function(req, res) {
  return req.method;
}

// TEST AUTOMATION [START] --

function automateVowsBatches() {
  var total = 0;
      postRegex = /post/i,
      getRegex = /get/i;
  
  var assert200 = function(r, k, t) {
    assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
    assert.isTrue(r.indexOf(util.format('{%s}', k)) >= 0);
  }

  var assert400 = function(r, k, t) {
    assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
    assert.isFalse(r.indexOf(util.format('{%s}', k)) >= 0);
  }
  
  var assert404 = function(r, k, t) {
    assert.isTrue(r.indexOf('HTTP/1.1 404 Not Found') >= 0);
    assert.isFalse(r.indexOf(util.format('{%s}', k)) >= 0);
  }
  
  Object.keys(controllerCtor).map(function(m) {
    if (m != 'super_' && controllerCtor.hasOwnProperty(m)) {
      var isGet = getRegex.test(m),
          isPost = postRegex.test(m);

      // GET + POST Routes
      if (isGet && isPost) {
        
        // get (200)
        multi.curl('-i /test/'+ m);
        (function(k, t) {
          currentBatch[util.format('[%d] Controller::%s responds w/200 for GET requests', t, k)] = function(results) {
            var r = results[t];
            assert200(r, k, t);
          }
        })(m, total++);
        
        // post (200)
        multi.curl('-i -X POST /test/'+ m);
        (function(k, t) {
          currentBatch[util.format('[%d] Controller::%s responds w/200 for POST requests', t, k)] = function(results) {
            var r = results[t];
            assert200(r, k, t);
          }
        })(m, total++);
        
        // Other methods (400)
        for (var i=0; i < restMethods.length; i++) {
          multi.curl(util.format('-i -X %s /test/%s', restMethods[i], m));
          (function(k, t, rm) {
            currentBatch[util.format('[%d] Controller::%s responds w/400 for %s requests', t, k, rm)] = function(results) {
              var r = results[t];
              assert400(r, k, t);
            }
          })(m, total++, restMethods[i]);
        }
        
      // GET Routes
      } else if (isGet) {
        
        // get (200)
        multi.curl('-i /test/'+ m);
        (function(k, t) {
          currentBatch[util.format('[%d] Controller::%s responds w/200 for GET requests', t, k)] = function(results) {
            var r = results[t];
            assert200(r, k, t);
          }
        })(m, total++);

        // post (404)
        multi.curl('-i -X POST /test/'+ m);
        (function(k, t) {
          currentBatch[util.format('[%d] Controller::%s responds w/404 for POST requests', t, k)] = function(results) {
            var r = results[t];
            assert404(r, k, t);
          }
        })(m, total++);
        
        // Other methods (400)
        for (var i=0; i < restMethods.length; i++) {
          multi.curl(util.format('-i -X %s /test/%s', restMethods[i], m));
          (function(k, t, rm) {
            currentBatch[util.format('[%d] Controller::%s responds w/400 for %s requests', t, k, rm)] = function(results) {
              var r = results[t];
              assert400(r, k, t);
            }
          })(m, total++, restMethods[i]);
        }
      
      // POST Routes
      } else if (isPost) {
        
        // get (404)
        multi.curl('-i /test/' + m);
        (function(k, t) {
          currentBatch[util.format('[%d] Controller::%s responds w/404 for GET requests', t, k)] = function(results) {
            var r = results[t];
            assert404(r, k, t);
          }
        })(m, total++);
         
        // post (200)
        multi.curl('-i -X POST /test/'+ m);
        (function(k, t) {
          currentBatch[util.format('[%d] Controller::%s responds w/200 for POST requests', t, k)] = function(results) {
            var r = results[t];
            assert200(r, k, t);
          }
        })(m, total++);
        
        // Other methods (400)
        for (var i=0; i < restMethods.length; i++) {
          multi.curl(util.format('-i -X %s /test/%s', restMethods[i], m));
          (function(k, t, rm) {
            currentBatch[util.format('[%d] Controller::%s responds w/400 for %s requests', t, k, rm)] = function(results) {
              var r = results[t];
              assert400(r, k, t);
            }
          })(m, total++, restMethods[i]);
        }
        
      }
    }
  });
}

// TEST AUTOMATION [END] --

var batch = {};
var currentBatch = batch['Route Functions (sessions not enabled)'] = {
  
  topic: function() {
    
    var promise = new EventEmitter();
    
    app.backupFilters();
    
    multi.exec(function(err, results) {
      app.restoreFilters();
      promise.emit('success', err || results);
    });
    
    return promise;
  }
  
}

automateVowsBatches(); // Creates the nifty automated tests

// console.exit(batch);

vows.describe('Application Controllers').addBatch(batch).export(module);
