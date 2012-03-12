
var app = require('../fixtures/bootstrap.js'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

var sessionBackup, sessionSupport;

vows.describe('CSRF (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      
      var promise = new EventEmitter();
      
      console.log("    Note: using HTTP/403 as the response for testing purposes (default is HTTP/400).");
      console.log("    This prevents any confusion between the regular HTTP/400 errors and the CSRF ones.\n")
      
      sessionBackup = app.session;
      sessionSupport = app.supports.session;
      
      app.use('cookie_parser');
      app.use('body_parser');
      app.use('session', {storage: 'redis', guestSessions: true, salt: 'abc1234'});
      app.use('csrf', {
        onFailure: 403
      });

      app.curl('-i /csrf', function(err, buf) {
        if (err) throw err;
        else {
          var sess = buf.match(/_sess=(.*?);/)[1];
      
          app.curl(util.format('-i --cookie "_sess=%s" /csrf/test', sess), function(err, buf) {
            if (err) throw err;
            else {
              var token = buf.match(/[a-f0-9]{32}/)[0];
              
              /* GET TESTS */
              
              // GET » Token absence (403)
              multi.curl(util.format('-i --cookie "_sess=%s" /csrf/check/get', sess));

              // GET Csrf check + invalid token + valid data (403)
              multi.curl(util.format('-i --cookie "_sess=%s" -G -d "protect_key=INVALID" -d "name=ernie" -d "age=28" /csrf/check/get/query', sess));
              
              // GET Csrf check + valid token + invalid data (404)
              multi.curl(util.format('-i --cookie "_sess=%s" -G -d "protect_key=%s" -d "name=ernie" -d "age=INVALID" /csrf/check/get/query', sess, token));
              
              // GET Csrf check + valid token + valid data (200)
              multi.curl(util.format('-i --cookie "_sess=%s" -G -d "protect_key=%s" -d "name=ernie" -d "age=28" /csrf/check/get/query', sess, token));
              
              /* POST TESTS */
              
              // POST » Token absence (400)
              multi.curl(util.format('-i -X POST --cookie "_sess=%s" /csrf/check/post', sess));

              // POST Csrf check + invalid token + valid data (400)
              multi.curl(util.format('-i -X POST --cookie "_sess=%s" -d "protect_key=INVALID" -d "name=ernie" -d "age=28" /csrf/check/post/fields', sess));
              
              // POST Csrf check + valid token + invalid data (400)
              multi.curl(util.format('-i -X POST --cookie "_sess=%s" -d "protect_key=%s" -d "name=ernie" -d "age=INVALID" /csrf/check/post/fields', sess, token));
              
              // POST Csrf check + valid token + valid data (200)
              multi.curl(util.format('-i -X POST --cookie "_sess=%s" -d "protect_key=%s" -d "name=ernie" -d "age=28" /csrf/check/post/fields', sess, token));
              
              /* PUT TESTS */

              // PUT » Token absence (400)
              multi.curl(util.format('-i -X PUT --cookie "_sess=%s" /csrf/check/post', sess));

              // POST Csrf check + invalid token + valid data (400)
              multi.curl(util.format('-i -X PUT --cookie "_sess=%s" -d "protect_key=INVALID" -d "name=ernie" -d "age=28" /csrf/check/post/fields', sess));
              
              // POST Csrf check + valid token + invalid data (400)
              multi.curl(util.format('-i -X PUT --cookie "_sess=%s" -d "protect_key=%s" -d "name=ernie" -d "age=INVALID" /csrf/check/post/fields', sess, token));
              
              // POST Csrf check + valid token + valid data (200)
              multi.curl(util.format('-i -X PUT --cookie "_sess=%s" -d "protect_key=%s" -d "name=ernie" -d "age=28" /csrf/check/post/fields', sess, token));
              
              multi.exec(function(err, results) {
                delete app.supports.session;
                promise.emit('success', err || results);
              });
            }
          });
          
        }
      });
      
      return promise;
    },
    
    "Responds with HTTP/403 on token absence (GET, no validation)": function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('HTTP/1.1 403 Forbidden') >= 0);
    },
    
    "Responds with HTTP/403 on invalid token and valid data (GET, with validation)": function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('HTTP/1.1 403 Forbidden') >= 0);
    },
    
    "Responds with HTTP/404 on valid token and invalid data (GET, with validation)": function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    "Responds with HTTP/200 on valid token and valid data (GET, with validation)": function(results) {
      var r = results[3];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
    },
    
    "Responds with HTTP/403 on token absence (POST, no validation)": function(results) {
      var r = results[4];
      assert.isTrue(r.indexOf('HTTP/1.1 403 Forbidden') >= 0);
    },
    
    "Responds with HTTP/403 on invalid token and valid data (POST, with validation)": function(results) {
      var r = results[5];
      assert.isTrue(r.indexOf('HTTP/1.1 403 Forbidden') >= 0);
    },
    
    "Responds with HTTP/400 on valid token and invalid data (POST, with validation)": function(results) {
      var r = results[6];
      assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
    },
    
    "Responds with HTTP/200 on valid token and valid data (POST, with validation)": function(results) {
      var r = results[7];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
    },
    
    "Responds with HTTP/403 on token absence (PUT, no validation)": function(results) {
      var r = results[8];
      assert.isTrue(r.indexOf('HTTP/1.1 403 Forbidden') >= 0);
    },
    
    "Responds with HTTP/403 on invalid token and valid data (PUT, with validation)": function(results) {
      var r = results[9];
      assert.isTrue(r.indexOf('HTTP/1.1 403 Forbidden') >= 0);
    },
    
    "Responds with HTTP/400 on valid token and invalid data (PUT, with validation)": function(results) {
      var r = results[10];
      assert.isTrue(r.indexOf('HTTP/1.1 400 Bad Request') >= 0);
    },
    
    "Responds with HTTP/200 on valid token and valid data (PUT, with validation)": function(results) {
      var r = results[11];
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
    }

  }
  
}).export(module);