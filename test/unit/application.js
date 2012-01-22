
var CoreJS = require('../fixtures/get-corejs-constructor'),
    vows = require('vows'),
    assert = require('assert'),
    testSkeleton = CoreJS.path + '/test/fixtures/test-skeleton',
    framework = CoreJS.bootstrap(testSkeleton, {}),
    app = framework.defaultApp;

// Override framework's directory with test-framework/
framework.path = CoreJS.path + '/test/fixtures/test-framework';

vows.describe('lib/application.js').addBatch({
  
  'Application Integrity Checks': {
    
    'Set domain': function() {
      assert.equal(app.domain, 'localhost');
    },
    
    'Set application path': function() {
      assert.equal(app.path, testSkeleton);
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
      catch(e) { assert.isTrue(e instanceof Error); }
    }
    
  }
  
}).export(module);

    
