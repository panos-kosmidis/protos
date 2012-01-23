
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    pathModule = require('path'),
    EventEmitter = require('events').EventEmitter;
    
vows.describe('lib/framework.js').addBatch({
  
  'Framework Integrity Checks': {
    
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
    
  }
  
}).export(module);