
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    pathModule = require('path'),
    EventEmitter = require('events').EventEmitter;

app.logging = false;

vows.describe('lib/protos.js').addBatch({
  
  'Integrity Checks': {
    
    'Sets environment': function() {
      assert.isTrue(/^(debug|development|travis)$/.test(protos.environment));
    },
    
    'Sets application': function() {
      assert.instanceOf(protos.app, protos.lib.application);
    },
    
    'Sets protos path': function() {
      var path = pathModule.resolve(__dirname, '../../');
      assert.equal(protos.path, protos.constructor.path + '/test/fixtures/test-protos');
    },
    
    'Inherits from EventEmitter': function() {
      // Framework inherits from EventEmitter indirectly
      assert.isFunction(protos.on);
      assert.isFunction(protos.emit);
    },
    
    'Detects drivers': function() {
      assert.isFunction(protos.drivers.mysql);
    },
    
    'Detects storages': function() {
      assert.isFunction(protos.storages.redis);
    },
    
    'Detects view engines': function() {
      assert.isFunction(protos.engines.eco);
    }
    
  },
  
  'Protos::require': {
    
    'Returns the required module': function() {
      var module1 = protos.require('node_modules/multi'),
          module2 = protos.require('multi');
      assert.isFunction(module1);
      assert.isFunction(module2);
    },
    
    'Can require/reload modules without using module cache': function() {
      var h1 = protos.require('handlebars', true);
      var h2 = protos.require('handlebars', true);
      
      h1.a = 99;
      h2.a = 55;

      assert.equal(h1.a, 99);
      assert.equal(h2.a, 55);
    },
    
    'Accepts relative/absolute paths': function() {
      assert.isFunction(protos.require('./node_modules/multi'));
      assert.isFunction(protos.require('/node_modules/multi'));
    },
    
  }
  
}).export(module);