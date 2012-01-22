
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');

vows.describe('lib/application.js').addBatch({
  
  'Application Integrity Checks': {
    
    'Set domain': function() {
      assert.equal(app.domain, 'localhost');
    },
    
    'Set application path': function() {
      assert.equal(app.path, framework.constructor.path + '/test/fixtures/test-skeleton');
    },
    
    'Detected library overrides': function() {
      assert.isFunction(app.lib.controller);
    },
    
    'Initialized models': function() {
      assert.isTrue(app.models.users instanceof framework.lib.model);
    },
    
    'Initialized helpers': function() {
      assert.isTrue(app.helpers.main instanceof framework.lib.helper);
    },
    
    'Initialized controllers': function() {
      assert.isTrue(app.controllers.main instanceof framework.lib.controller);
    },
    
    'Initialized framework engines': function() {
      assert.isTrue(app.engines.eco instanceof framework.lib.engine);
    },
    
    'Initialized application engines': function() {
      assert.isTrue(app.engines.myengine instanceof framework.lib.engine);
    }
    
  }
  
}).addBatch({
  
  'Application::registerEnable': {
    
    topic: function() {
      app.registerEnable('myFeature', function(config) {
        this.__ValidContext = true;
        this.__PassedConfig = config;
      });
      return app;
    },
    
    'Properly registers feature': function(topic) {
      assert.isFunction(app.__enableFeatures.myFeature);
    }
    
  }
  
}).addBatch({
  
  'Application::enable': {
    
    topic: function() {
      app.enable('myFeature', {testVar: 99});
      return app;
    },
    
    'Registers feature in app.supports': function() {
      assert.isTrue(app.supports.myFeature);
    },
    
    'Calls registered function correctly within app context': function() {
      assert.isTrue(app.__ValidContext);
    },
    
    'Passes config to registered function': function() {
      assert.equal(app.__PassedConfig.testVar, 99);
    }

  }
  
}).addBatch({
  
  'Application::use': {
    
    'Loads application addons': function() {
      app.use('application-addon', {testVal: 99});
      assert.isTrue(app.__LoadedApplicationAddon);
    },

    'Provides correct arguments to app addons': function() {
      assert.equal(app.__ApplicationAddonConfig.testVal, 99);
    },
    
    'Loads framework addons': function() {
      app.use('framework-addon', {testVal: 99});
      assert.isTrue(app.__LoadedFrameworkAddon);
    },
    
    'Provides correct arguments to framework addons': function() {
      assert.equal(app.__FrameworkAddonConfig.testVal, 99);
    },
    
    'Throws an error if addon not found': function() {
      try { app.use('unknown-addon'); } 
      catch(e) { assert.isTrue(e instanceof Function); }
    }
    
  }
  
}).addBatch({
  
  'Application::url': function() {
    assert.isTrue(true);
  }
  
}).export(module);

    
