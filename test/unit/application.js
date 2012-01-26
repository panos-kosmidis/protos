
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

app.logging = false;

var multi = app.createMulti(app);

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
      assert.instanceOf(app.controller, framework.lib.controller);
    },
    
    'Inherits from EventEmitter': function() {
      assert.instanceOf(app, EventEmitter);
    },
    
    'Initializes models': function() {
      assert.instanceOf(app.models.users, framework.lib.model);
    },
    
    'Initializes helpers': function() {
      assert.instanceOf(app.helpers.main, framework.lib.helper);
    },
    
    'Initializes controllers': function() {
      assert.instanceOf(app.controllers.main, framework.lib.controller);
    },
    
    'Initializes framework engines': function() {
      assert.instanceOf(app.engines.eco, framework.lib.engine);
    },
    
    'Initializes application engines': function() {
      assert.instanceOf(app.engines.myengine, framework.lib.engine);
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
      catch(e) { assert.instanceOf(e, Error); }
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
      assert.equal(app.relPath(fullPath, '/views/main'), expected);
      assert.equal(app.relPath(fullPath, '/views/main/'), expected);
      assert.equal(app.relPath(fullPath, 'views/main/'), expected);
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
  
  'Application::addFilter': {
    
    topic: function() {
      app.addFilter('filter', function(data) {
        /* Filter 1 */
        data.push('>>');
        return data;
      });
      
      app.addFilter('filter', function(data) {
        /* Filter 2 */
        data.unshift('<<');
        return data;
      });
      
      return app.__filters;
    },
    
    'Properly registers filters': function(filters) {
      assert.deepEqual(Object.keys(filters), ['filter']);
      assert.strictEqual(filters.filter.length, 2);
      assert.isTrue(filters.filter[0].toString().indexOf('/* Filter 1 */') >= 0);
      assert.isTrue(filters.filter[1].toString().indexOf('/* Filter 2 */') >= 0);
    }
    
  },
  
  'Application::applyFilters': {
    
    topic: function() {
      return app.applyFilters('filter', ['data']);
    },
    
    'Returns valid values': function(topic) {
      assert.deepEqual(topic, ['<<', 'data', '>>']);
    }
    
  }
  
}).addBatch({
  
  'Application::getResource': {
    
    topic: function() {
      var promise = new EventEmitter();
      app.context = {
        alpha: {name: 'alpha'},
        beta: {
          gamma: {name: 'gamma'}
        }
      }

      app.getResource('storages/redis', function(storage) {
        promise.emit('success', storage);
      });
      
      return promise;
    },
    
    'Gets {context}/{resource}': function() {
      var drv = app.getResource('context/alpha');
      assert.equal(drv.name, 'alpha');
    },
    
    'Gets {context}/{group}:{resource}': function() {
      var drv = app.getResource('context/beta:gamma');
      assert.equal(drv.name, 'gamma');
    },
    
    'Works asynchronously if callback provided': function(storage) {
      assert.instanceOf(storage, framework.storages.redis);
    }
    
  }
  
}).addBatch({
  
  'Application::createMulti': {
    
    'Returns a multi object': function() {
      var ob = {method: function() {}}
      var multi = app.createMulti(ob, {});
      assert.equal(multi.constructor.name, 'Multi');
    }
    
  }
  
}).addBatch({
  
  'Application::curl': {
    
    topic: function() {
      var promise = new EventEmitter();
      multi.curl('/robots.txt');
      multi.curl('-X PUT /');
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      return promise;
    },
    
    'Returns valid data': function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.isTrue(r1.indexOf('www.robotstxt.org') >= 0);
      assert.isTrue(r2.indexOf('400 Bad Request') >= 0);
    }
    
  }
  
}).addBatch({
  
  'Application::clientRequest': {
    
    topic: function() {
      var promise = new EventEmitter();
      multi.clientRequest('/');
      multi.clientRequest({path: '/', method: 'PUT'});
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      return promise;
    },
    
    'Returns valid data': function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.isString(r1[0]);
      assert.isTrue(r1[0].length > 0);
      assert.strictEqual(r1[1].status, '200 OK');
      assert.isString(r2[0]);
      assert.isTrue(r2[0].length > 0);
      assert.strictEqual(r2[1].status, '400 Bad Request');
    }
    
  }
  
}).export(module);
