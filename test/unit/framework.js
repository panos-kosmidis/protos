
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    pathModule = require('path'),
    EventEmitter = require('events').EventEmitter;

app.logging = false;

vows.describe('lib/framework.js').addBatch({
  
  'Integrity Checks': {
    
    'Sets Version': function() {
      var vRegex = /^\d+\.\d+\.\d+$/;
      assert.isTrue(vRegex.test(framework.version));
    },
    
    'Sets environment': function() {
      assert.isTrue(/^(debug|development|travis)$/.test(framework.environment));
    },
    
    'Sets application': function() {
      assert.instanceOf(framework.app, framework.lib.application);
    },
    
    'Sets framework path': function() {
      var path = pathModule.resolve(__dirname, '../../');
      assert.equal(framework.path, framework.constructor.path + '/test/fixtures/test-framework');
    },
    
    'Inherits from EventEmitter': function() {
      // Framework inherits from EventEmitter indirectly
      assert.isFunction(framework.on);
      assert.isFunction(framework.emit);
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
      var module1 = framework.require('node_modules/multi'),
          module2 = framework.require('multi');
      assert.isFunction(module1);
      assert.isFunction(module2);
    },
    
    'Can require/reload modules without using module cache': function() {
      var h1 = framework.require('handlebars', true);
      var h2 = framework.require('handlebars', true);
      
      h1.a = 99;
      h2.a = 55;

      assert.equal(h1.a, 99);
      assert.equal(h2.a, 55);
    },
    
    'Accepts relative/absolute paths': function() {
      assert.isFunction(framework.require('./node_modules/multi'));
      assert.isFunction(framework.require('/node_modules/multi'));
    },
    
  }
  
}).export(module);