
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var sess, shash, storage, sessId, guestSessId;

var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

app.on('session_load', function(sid, session) {
  // Update sessId every time a new user session is created
  if (session.user) sessId = sid;
  else if (session.guest) guestSessId = sid;
});

vows.describe('Sessions').addBatch({
  
  'Guest Sessions disabled': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      app.enable('session', {storage: 'redis', guestSessions: false});
      
      // Response should not contain any session cookies
      multi.curl('-i /session');
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Response should not contain any session cookies': function(results) {
          
      var r1 = results[0];
      assert.strictEqual(r1.indexOf('Set-Cookie'), -1);
    }
    
  }
  
}).addBatch({
  
  'Guest Sessions enabled (persistent)': {
    
    topic: function() {
      var promise = new EventEmitter(),
          md5re = /=([a-f0-9]{32});/;
      
      app.session.config.guestSessions = true;
      storage = app.session.storage;
      sess = app.session.config.sessCookie;
      shash = app.session.config.hashCookie;
      
      // Response should include session cookies
      multi.curl('-i /session');
      
      multi.exec(function(err, results) {
        var matches = results[0].match(md5re);
        if (matches) {
          guestCookie = matches[1];
          storage.getHash(guestSessId, function(err, data) {
            results.push(err || data);
            storage.delete(guestSessId, function(err, data) {
              if (err) console.log(err);
              promise.emit('success', err || results);
            });
          });
        } else {
          promise.emit('success', err || results);
        }
      });
      
      return promise;
    },

    'Verified cookies & session data (in storage)': function(results) {
      var r = results[0],
          session = results[1] || {};
          
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf(util.format('Set-Cookie: %s=null;', shash)) >= 0);              // Session Hash
      assert.isTrue(r.indexOf(util.format('Set-Cookie: %s=%s;', sess, guestSessId)) >= 0);    // Session ID
      assert.deepEqual(session, {guest: '1'});
    },
    
    'Cookie Expiration dates are accurate': function(results) {
      var r = results[0],
          session = results[1];
          
      // Check expiration date
      var hashExpire, sessExpire;
      r.split(/\r\n/).forEach(function(line) {
        var expires, hashExpire, sessExpire, shouldExpire;
        if (line.indexOf(util.format('%s=null;', shash)) >= 0) {
          expires = line.slice(line.lastIndexOf('=')+1);
          hashExpire = new Date(expires);
          shouldExpire = new Date(Date.now() - 3600*1000);
          assert.equal(hashExpire.toString(), shouldExpire.toString());  // Cookie should have expired
        } else if (line.indexOf('=' + guestSessId) >= 0) {
          expires = line.slice(line.lastIndexOf('=')+1);
          sessExpire = new Date(expires);
          shouldExpire = new Date(Date.now() + app.session.config.guestExpires*1000);
          assert.equal(sessExpire.toString(), shouldExpire.toString());  // Check if Expiration matches config
        }
      });
    }
    
  }
  
}).addBatch({
  
  'Session Creation (persistent)': {
    topic: function() {
      var promise = new EventEmitter();
      
      multi.curl('-i -G -d "permanent=1" /session/create/ernie');
      
      multi.exec(function(err, results) {
        // promise.emit('success', err || results);
        
        // Verify that session is indeed stored
        storage.getHash(sessId, function(err, data) {
          results.push(err || data);
          promise.emit('success', err || results);
        });
      });
      
      return promise;
    },
    
    'Verified cookies & session data (in storage)': function(results) {
      var r = results[0],
          session = results[1] || {};
      
      // Make sure session.pers is an integer, for util.inspect
      if (typeof session == 'object' && session.pers == '1') session.pers = 1;
      
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      assert.isTrue(r.indexOf(util.format('Set-Cookie: %s=%s;', sess, sessId)) >= 0);         // Session ID
      assert.isTrue(r.indexOf(util.format('Set-Cookie: %s=%s;', shash, session.fpr)) >= 0);   // Session Hash
      assert.isTrue(r.indexOf(util.inspect(session)) >= 0);
    },
    
    'Cookie expiration dates are accurate': function(results) {
      var r = results[0],
          session = results[1];
      
      // Check expiration date
      var hashExpire, sessExpire;
      r.split(/\r\n/).forEach(function(line) {
        var expires, hashExpire, sessExpire, shouldExpire;
        if (line.indexOf('=' + session.fpr) >= 0) {
          expires = line.slice(line.lastIndexOf('=')+1);
          hashExpire = new Date(expires);
          shouldExpire = new Date(Date.now() + app.session.config.regenInterval*1000);
          assert.equal(hashExpire.toString(), shouldExpire.toString());   // Check if Expiration matches config
        } else if (line.indexOf('=' + sessId) >= 0) {
          expires = line.slice(line.lastIndexOf('=')+1);
          sessExpire = new Date(expires);
          shouldExpire = new Date(Date.now() + app.session.config.permanentExpires*1000);
          assert.equal(sessExpire.toString(), shouldExpire.toString());  // Check if Expiration matches config
        }
      });
    }
  }
  
}).addBatch({
  
  'Session Usage': {
    
  }
  
}).addBatch({
  
  'Session Regenerate': {
    
  }
  
}).addBatch({
  
  'Session Destroy': {
    
  }
  
}).export(module);