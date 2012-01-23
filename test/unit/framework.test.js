
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    pathModule = require('path'),
    EventEmitter = require('events').EventEmitter;
    
vows.describe('lib/framework.js').addBatch({
  
  'Integrity Checks': {
    
    'Sets Version': function() {
      var vRegex = /^\d+\.\d+\.\d+$/;
      assert.isTrue(vRegex.test(framework.version));
    },
    
    'Sets environment': function() {
      assert.equal(framework.environment, 'development');
    },
    
    'Sets framework path': function() {
      var path = pathModule.resolve(__dirname, '../../');
      assert.equal(framework.path, framework.constructor.path + '/test/fixtures/test-framework');
    },
    
    'Inherits from EventEmitter': function() {
      // Framework inherits from EventEmitter indirectly
      var cond1 = framework.on instanceof Function,
          cond2 = framework.emit instanceof Function;
      assert.isTrue(cond1 && cond2);
    },
    
    'Configures VHosts': function() {
      assert.equal(framework.vhosts.localhost.domain, 'localhost');
    },
    
    'Sets default VHost': function() {
      assert.equal(framework.vhosts.default.domain, 'localhost');
    },
    
    'Registers apps by domain': function() {
      assert.isTrue(framework.apps.localhost instanceof framework.lib.application);
    },
    
    'Detects drivers': function() {
      assert.isFunction(framework.drivers.mysql);
    },
    
    'Detects storages': function() {
      assert.isFunction(framework.storages.redis);
    },
    
    'Detects view engines': function() {
      assert.isFunction(framework.engines.eco);
    }
    
  },
  
  'CoreJS::require': {
    
    'Returns the required module': function() {
      var module = framework.require('node_modules/multi');
      assert.isFunction(module);
    },
    
    'Accepts relative/absolute paths': function() {
      var m1 = framework.require('./node_modules/multi') instanceof Function,
          m2 = framework.require('/node_modules/multi') instanceof Function;
      assert.isTrue(m1 && m2);
    }
    
  }
  
}).addBatch({
  
  'CoreJS::onAppEvent': {
    
    topic: function() {
      // Attach event
      framework.onAppEvent('__testing_event', function() {
        app.__onAppEventSuccess = true;
      });
      // Emit event
      app.emit('__testing_event');
      return app.__onAppEventSuccess;
    },
    
    'Properly registers events': function(topic) {
      assert.isTrue(topic);
    }
    
  }
  
}).export(module);