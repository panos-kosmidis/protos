
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');

// Enable session
app.enable('session', {storage: 'redis'});

vows.describe('lib/session.js').addBatch({
  
  'Integrity Checks': {
    
    'Registered app.supports.session': function() {
      assert.isTrue(app.supports.session);
    },
    
    'Available via app.session': function() {
      assert.instanceOf(app.session, framework.lib.session);
    },
    
  },
  
  'Session::md5': {

    'Returns valid md5 hashes': function() {
      // MD5 ("hello") = 5d41402abc4b2a76b9719d911017c592
      var hash = '5d41402abc4b2a76b9719d911017c592';
      assert.equal(app.session.md5('hello'), hash);
    }

  },
  
  'Session::createHash': {
    
    'Returns valid {sessId} for guest sessions': function() {
      var ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/535.7 (KHTML, like Gecko) Chrome/16.0.912.75',
          hash = app.session.createHash(ua, true),
          md5Regex = framework.regex.md5_hash;
      var props = Object.getOwnPropertyNames(hash);
      assert.isTrue(props.length === 1 && props[0] == 'sessId' && md5Regex.test(hash.sessId));
    }
    
  },
  
  'Session::typecast': {
    
    topic: function() {
      app.session.config.typecastVars = ['vInt', 'vFloat', 'vNull', 'vBool']
      return app.session.typecast({
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