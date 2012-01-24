
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util');

vows.describe('lib/controller.js').addBatch({
  
  'Integrity Checks': {
    
    'Routing functions are set': function() {
      var routeGet = app.controller.constructor.routingFunctions.get;
      assert.isFunction(routeGet);
    }
    
  },
  
  'Controller::getControllerByAlias': {
    
    'Returns the correct controler': function() {
      app.controllers.blog = new framework.lib.controller;
      var controller = app.controller.getControllerByAlias('blog');
      assert.isTrue(controller instanceof framework.lib.controller);
    },
    
    'Accepts start/end slashes in alias': function() {
      var ctor = framework.lib.controller;
      assert.isTrue(app.controller.getControllerByAlias('/blog') instanceof ctor);
      assert.isTrue(app.controller.getControllerByAlias('blog/') instanceof ctor);
      assert.isTrue(app.controller.getControllerByAlias('/blog/') instanceof ctor);
      delete app.controllers.blog;
    },
    
    'Returns undefined on unknown controller': function() {
      var returnedValue = app.controller.getControllerByAlias('/unknown');
      assert.isUndefined(returnedValue);
    },
    
  },
  
  'Controller::getAlias': {
    
    'Returns proper alias for a className': function() {
      var alias = app.controller.getAlias('BlogController');
      assert.equal(alias, 'blog');
    }
    
  },
  
  'CController::getHelper': {
    
    'Returns the helper associated with controller': function() {
      var helper = app.controller.getHelper();
      assert.isTrue(helper instanceof framework.lib.helper);
    }
    
  }
    
}).export(module);