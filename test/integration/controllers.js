
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

vows.describe('Application Controllers').addBatch(batch).addBatch({
  
  'Controller Validation: GET': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      app.backupFilters();
      
      // Parameter validation: valid 
      multi.curl('-i /test/qstring/abcde');
      
      // Parameter validation: invalid
      multi.curl('-i /test/qstring/12346');
      
      // Query String values + no param validation
      multi.curl('-i -G -d "alpha=1&bravo=2&charlie=3" /test/qstring');
      
      // Query String values + param validation
      multi.curl('-i -G -d "alpha=4&bravo=5&charlie=6" /test/qstring/abc/123');
      
      // Query String validation + no param validation 
      multi.curl('-i -G -d "name=john&id=1&trigger=abc" /test/qstring/novalidate-param');
      
      // Query String validation + param validation
      multi.curl('-i -G -d "name=charlie&id=123" /test/qstring/validate/abc/jkl');
      
      // Validation Messages: strings
      multi.curl('-i -G -d "word=123&num=123" /test/qstring/messages');
      
      // Validation Messages: functions
      multi.curl('-i -G -d "word=cinnamon&num=toast" /test/qstring/messages');
      
      multi.exec(function(err, results) {
        app.restoreFilters();
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Responds w/200 on valid parameters': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ rule1: 'abcde' }") >= 0);
    },
    
    'Responds w/404 on invalid parameters': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    'Detects Query String values when not validating parameters': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ alpha: '1', bravo: '2', charlie: '3' }") >= 0);
    },
    
    'Detects Query String values when validating parameters': function(results) {
      var r = results[3];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ rule1: 'abc', rule2: '123' } { alpha: '4', bravo: '5', charlie: '6' }") >= 0);
    },
    
    'Validates query strings when not validating parameters': function(results) {
      var r = results[4];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ name: 'john', id: 1, trigger: 'abc' }") >= 0);
    },
    
    'Validates query strings when validating parameters': function(results) {
      var r = results[5];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf("{ rule1: 'abc', rule2: 'jkl' } { name: 'charlie', id: 123 }") >= 0);
    },
    
    'Responds w/400 + returns valid error messages': function(results) {
      var r = results[6];
      assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
      assert.isTrue(r.indexOf("<p>Oops! Invalid word...</p>") >= 0);
    },
    
    'Responds w/400 + returns dynamic error messages': function(results) {
      var r = results[7];
      assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
      assert.isTrue(r.indexOf("<p>Invalid number: toast</p>") >= 0);
    }
    
  }
  
}).export(module);
