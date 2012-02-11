
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    pathModule = require('path'),
    EventEmitter = require('events').EventEmitter;

app.logging = false;

vows.describe('lib/corejs.js').addBatch({
  
  'Integrity Checks': {
    
    'Sets environment': function() {
      assert.isTrue(/^(debug|development|travis)$/.test(corejs.environment));
    },
    
    'Sets application': function() {
      assert.instanceOf(corejs.app, corejs.lib.application);
    },
    
    'Sets corejs path': function() {
      var path = pathModule.resolve(__dirname, '../../');
      assert.equal(corejs.path, corejs.constructor.path + '/test/fixtures/test-corejs');
    },
    
    'Inherits from EventEmitter': function() {
      // Framework inherits from EventEmitter indirectly
      assert.isFunction(corejs.on);
      assert.isFunction(corejs.emit);
    },
    
    'Detects drivers': function() {
      assert.isFunction(corejs.drivers.mysql);
    },
    
    'Detects storages': function() {
      assert.isFunction(corejs.storages.redis);
    },
    
    'Detects view engines': function() {
      assert.isFunction(corejs.engines.eco);
    }
    
  },
  
  'CoreJS::require': {
    
    'Returns the required module': function() {
      var module1 = corejs.require('node_modules/multi'),
          module2 = corejs.require('multi');
      assert.isFunction(module1);
      assert.isFunction(module2);
    },
    
    'Can require/reload modules without using module cache': function() {
      var h1 = corejs.require('handlebars', true);
      var h2 = corejs.require('handlebars', true);
      
      h1.a = 99;
      h2.a = 55;

      assert.equal(h1.a, 99);
      assert.equal(h2.a, 55);
    },
    
    'Accepts relative/absolute paths': function() {
      assert.isFunction(corejs.require('./node_modules/multi'));
      assert.isFunction(corejs.require('/node_modules/multi'));
    },
    
  }
  
}).export(module);