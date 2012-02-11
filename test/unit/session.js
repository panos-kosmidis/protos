
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');

app.logging = false;

// Enable session
app.enable('session', {storage: 'redis'});

// Detach session, use session standalone
var session = app.session;
app.session = null;
delete app.supports.session;

vows.describe('lib/session.js').addBatch({
  
  'Session::md5': {

    'Returns valid md5 hashes': function() {
      // MD5 ("hello") = 5d41402abc4b2a76b9719d911017c592
      var hash = '5d41402abc4b2a76b9719d911017c592';
      assert.equal(session.md5('hello'), hash);
    }

  },
  
  'Session::createHash': {
    
    'Returns valid {sessId} for guest sessions': function() {
      var ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.75',
          hash = session.createHash(ua, true),
          md5Regex = corejs.regex.md5_hash;
      var props = Object.getOwnPropertyNames(hash);
      assert.isTrue(props.length === 1 && props[0] == 'sessId' && md5Regex.test(hash.sessId));
    }
    
  },
  
  'Session::typecast': {
    
    topic: function() {
      session.config.typecastVars = ['vInt', 'vFloat', 'vNull', 'vBool']
      return session.typecast({
        vInt: '5',
        noConv: '5',
        vFloat: '2.3',
        vNull: 'null',
        vBool: 'true'
      });
    },
    
    'Converts integer': function(o) {
      assert.isTrue(o.vInt === 5);
    },
    
    'Converts float': function(o) {
      assert.isTrue(o.vFloat === 2.3);
    },
    
    'Converts null': function(o) {
      assert.isNull(o.vNull);
    },
    
    'Converts boolean': function(o) {
      assert.isTrue(o.vBool);
    },
    
    'Skips keys not in typecastVars': function(o) {
      assert.equal(o.noConv, '5');
    }
    
  }
  
}).export(module);