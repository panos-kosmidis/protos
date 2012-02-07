
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app),
    controllerCtor = app.controller.constructor,
    restMethods = app.otherMethods;
    
var loginUrl = app.url(app.loginUrl);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

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
  var total = 0,
      postRegex = /post/i,
      getRegex = /get/i,
      publicRegex = /public/i,
      privateRegex = /private/i;
  
  var assert200 = function(r, k, t) {
    assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
    assert.isTrue(r.indexOf(util.format('{%s}', k)) >= 0);
  }
  
  var assert302 = function(r, k, t) {
    assert.isTrue(r.indexOf('HTTP/1.1 302 Moved Temporarily') >= 0);
    assert.isTrue(r.indexOf('Location: ' + loginUrl) >= 0);
    assert.equal(r.indexOf('Set-Cookie: '), -1);
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
          isPost = postRegex.test(m),
          isGetPost = (isGet && isPost),
          isPublic = publicRegex.test(m),
          isPrivate = privateRegex.test(m);

      if (isGetPost) {
        if (isPublic) {
          // public_getpost
        } else if (isPrivate) {
          // private_getpost
        } else {
          // getpost
        }
      } else if (isGet) {
        if (m == 'get') {
          // get (200)
        } else if (isPublic) {
          // public_get
        } else if (isPrivate) {
          // private_get
        } else {
          throw new Error("Untested method: " + m);
        }
      } else if (isPost) {
        if (m == 'post') {
          // post
        } else if (isPublic) {
          // public_post
        } else if (isPrivate) {
          // private_post
        } else {
          throw new Error("Untested method: " + m);
        }
      } else {
        throw new Error("Untested method: " + m);
      }
 
    }
  });
}

// TEST AUTOMATION [END] --

var batch = {};
var currentBatch = batch['Route Functions (auth & sessions enabled, no auth cookies sent)'] = {
  
  topic: function() {
    
    var promise = new EventEmitter();
    
    // Enable sessions
    app.enable('session', {storage: 'redis', guestSessions: false});
    
    multi.exec(function(err, results) {
      promise.emit('success', err || results);
    });
    
    return promise;
  }
  
}

automateVowsBatches(); // Creates the nifty automated tests

// console.exit(batch);

vows.describe('Application Controllers').addBatch(batch).export(module);
