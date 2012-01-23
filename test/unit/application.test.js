
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;
    
vows.describe('lib/application.js').addBatch({
  
  'Integrity Checks': {
    
    'Sets domain': function() {
      assert.equal(app.domain, 'localhost');
    },
    
    'Sets application path': function() {
      assert.equal(app.path, framework.constructor.path + '/test/fixtures/test-skeleton');
    },
    
    'Detects library overrides': function() {
      assert.isFunction(app.lib.controller);
    },
    
    'Sets default controller': function() {
      assert.isTrue(app.controller instanceof framework.lib.controller);
    },
    
    'Inherits from EventEmitter': function() {
      assert.isTrue(app instanceof EventEmitter);
    },
    
    'Initializes models': function() {
      assert.isTrue(app.models.users instanceof framework.lib.model);
    },
    
    'Initializes helpers': function() {
      assert.isTrue(app.helpers.main instanceof framework.lib.helper);
    },
    
    'Initializes controllers': function() {
      assert.isTrue(app.controllers.main instanceof framework.lib.controller);
    },
    
    'Initializes framework engines': function() {
      assert.isTrue(app.engines.eco instanceof framework.lib.engine);
    },
    
    'Initializes application engines': function() {
      assert.isTrue(app.engines.myengine instanceof framework.lib.engine);
    }
    
  },
  
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
    
  },
  
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

  },
  
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
    
  },
  
  'Application::url': {
    
    'Returns proper url when no args provided': function() {
      assert.equal(app.url(), util.format('http://%s:%s/', app.domain, framework.config.server.listenPort));
    },
    
    'Returns proper url when run with path argument': function() {
      var q = '/item?id=25';
      assert.equal(app.url(q), util.format('http://%s:%s%s', app.domain, framework.config.server.listenPort, q));
    }
    
  },
  
  'Application::relPath': {
    
    'Returns a relative application path': function() {
      var fullPath = app.path + '/views/main';
      assert.equal(app.relPath(fullPath), 'views/main');
    },
    
    'Works when passing offset argument': function() {
      var fullPath = app.path + '/views/main/main-index.html';
      assert.equal(app.relPath(fullPath, 'views/main'), 'main-index.html');
    },
    
    'Handles offset argument w/slashes correctly': function() {
      var fullPath = app.path + '/views/main/main-index.html',
          expected = 'main-index.html';
      var r1 = app.relPath(fullPath, '/views/main') == expected,
          r2 = app.relPath(fullPath, '/views/main/') == expected,
          r3 = app.relPath(fullPath, 'views/main/') == expected;
      assert.isTrue(r1 && r2 && r3);
    }
    
  },
  
  'Application::fullPath': {
    
    'Returns the full path of an application resource': function() {
      assert.equal(app.fullPath('views/main'), app.path + '/views/main');
    }
    
  },
  
  'Application::driver': {
    
    'Returns a driver object': function() {
      var mysqlCtor = framework.drivers.mysql;
      framework.drivers.mysql = function() { this.success = true; }
      var driver = app.driver('mysql', {});
      assert.isTrue(driver.success);
      framework.drivers.mysql = mysqlCtor; // restore mysql constructor
    }
    
  },
  
  'Application::storage': {
    
    'Returns a storage object': function() {
      var redisCtor = framework.storages.redis;
      framework.storages.redis = function() { this.success = true; }
      var storage = app.storage('redis', {});
      assert.isTrue(storage.success);
      framework.storages.redis = redisCtor; // restore redis constructor
    }
    
  },
  
  'Application::getResource': {
    
    topic: function() {
      app.context = {
        alpha: {name: 'alpha'},
        beta: {
          gamma: {name: 'gamma'}
        }
      }
      return app;
    },
    
    'Gets {context}/{resource}': function() {
      var drv = app.getResource('context/alpha');
      assert.equal(drv.name, 'alpha');
    },
    
    'Gets {context}/{group}:{resource}': function() {
      var drv = app.getResource('context/beta:gamma');
      assert.equal(drv.name, 'gamma');
    }
    
  },
  
  'Application::createMulti': {
    
    'Returns a multi object': function() {
      var ob = {method: function() {}}
      var multi = app.createMulti(ob, {});
      assert.equal(multi.constructor.name, 'Multi');
    }
    
  }
  
}).export(module);