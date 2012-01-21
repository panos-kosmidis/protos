
var CoreJS = require('../fixtures/get-corejs-constructor'),
    vows = require('vows'),
    assert = require('assert'),
    testSkeleton = CoreJS.masterPath + '/test/fixtures/test-skeleton',
    framework = CoreJS.bootstrap(testSkeleton, {}),
    app = framework.defaultApp;

vows.describe('lib/application.js').addBatch({
  
  'Application Integrity Checks': {
    
    'Properly set domain': function() {
      assert.equal(app.domain, 'localhost');
    },
    
    'Properly set application path': function() {
      assert.equal(app.path, testSkeleton);
    },
    
    'Detected library overrides': function() {
      assert.isFunction(app.lib.controller);
    },
    
    'Properly initialized models': function() {
      assert.isTrue(app.models.users instanceof framework.lib.model);
    },
    
    'Properly initialized helpers': function() {
      assert.isTrue(app.helpers.main instanceof framework.lib.helper);
    },
    
    'Properly initialized controllers': function() {
      assert.isTrue(app.controllers.main instanceof framework.lib.controller);
    },
    
    'Properly initialized framework engines': function() {
      assert.isTrue(app.engines.eco instanceof framework.lib.engine);
    },
    
    'Properly initialized application engines': function() {
      assert.isTrue(app.engines.myengine instanceof framework.lib.engine);
    }
    
  }
  
}).export(module);

    
