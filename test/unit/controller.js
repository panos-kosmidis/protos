
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util');

app.logging = false;

vows.describe('lib/controller.js').addBatch({
  
  'Integrity Checks': {
    
    'Routing functions are set': function() {
      var routeGet = app.controller.constructor.get;
      assert.isFunction(routeGet);
    }
    
  },
  
  'Controller::getControllerByAlias': {
    
    'Returns the correct controler': function() {
      var c1 = app.controller.getControllerByAlias('main'),
          c2 = app.controller.getControllerByAlias('test'),
          c3 = app.controller.getControllerByAlias('/test/hello');
      assert.instanceOf(c1, app.controller.constructor);
      assert.instanceOf(c2, app.controllers.test.constructor);
      assert.instanceOf(c3, app.controllers.test.constructor);
    },
    
    'Accepts start/end slashes in alias': function() {
      var ctor = protos.lib.controller;
      assert.instanceOf(app.controller.getControllerByAlias('/blog'), ctor);
      assert.instanceOf(app.controller.getControllerByAlias('blog/'), ctor);
      assert.instanceOf(app.controller.getControllerByAlias('/blog/'), ctor);
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
    
  }
    
}).export(module);