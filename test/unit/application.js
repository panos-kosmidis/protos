
var app =require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

app.logging = false;

var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

vows.describe('lib/application.js').addBatch({
  
  'Integrity Checks': {
    
    'Sets domain': function() {
      assert.equal(app.domain, 'localhost');
    },
    
    'Sets application path': function() {
      assert.equal(app.path, corejs.constructor.path + '/test/fixtures/test-skeleton');
    },
    
    'Sets default controller': function() {
      assert.instanceOf(app.controller, corejs.lib.controller);
    },
    
    'Inherits from EventEmitter': function() {
      assert.instanceOf(app, EventEmitter);
    },
    
    'Initializes models': function() {
      assert.instanceOf(app.models.users, corejs.lib.model);
    },
    
    'Initializes helpers': function() {
      assert.equal(app.helpers.main.className, 'MainHelper');
    },
    
    'Initializes controllers': function() {
      assert.instanceOf(app.controllers.main, corejs.lib.controller);
    },
    
    'Initializes corejs engines': function() {
      assert.instanceOf(app.engines.eco, corejs.lib.engine);
    },
    
    'Initializes application engines': function() {
      assert.instanceOf(app.engines.eco, corejs.lib.engine);
    },
    
  }
  
}).addBatch({
  
  'Application Bootstrap': {
    
   'Successfully emits bootstrap events': function() {
      assert.isTrue(app.__initBootstrapEvent);
    }
    
  }
  
}).addBatch({
  
  'Application::url': {
    
    'Returns proper url when no args provided': function() {
      assert.equal(app.url(), util.format('http://%s:%s/', app.domain, corejs.config.server.listenPort));
    },
    
    'Returns proper url when run with path argument': function() {
      var q = '/item?id=25';
      assert.equal(app.url(q), util.format('http://%s:%s%s', app.domain, corejs.config.server.listenPort, q));
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
      var mysqlCtor = corejs.drivers.mysql;
      corejs.drivers.mysql = function() { this.success = true; }
      var driver = app._driver('mysql', {});
      assert.isTrue(driver.success);
      corejs.drivers.mysql = mysqlCtor; // restore mysql constructor
    }
    
  },
  
  'Application::storage': {
    
    'Returns a storage object': function() {
      var redisCtor = corejs.storages.redis;
      corejs.storages.redis = function() { this.success = true; }
      var storage = app._storage('redis', {});
      assert.isTrue(storage.success);
      corejs.storages.redis = redisCtor; // restore redis constructor
    }
    
  },
  
  'Application::addFilter': {
    
    topic: function() {
      app.attachFilter('filter', function(data) {
        /* Filter 1 */
        data.push('>>');
        return data;
      });
      
      app.attachFilter('filter', function(data) {
        /* Filter 2 */
        data.unshift('<<');
        return data;
      });
      
      return app.__filters;
    },
    
    'Properly registers filters': function(filters) {
      assert.isArray(filters.filter);
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
    
  },
  
  'Application::registerViewHelper': {
    
    topic: function() {
      var ob = {
        self: true,
        method: function() {
          if (this.self) return '{OK}';
          else return '{FAIL}';
        }
      }
      
      app.registerViewHelper('$method', ob.method);
      app.registerViewHelper('$method_with_context', ob.method, ob);

      return ob;
    },
    
    "Properly registers view helpers": function(ob) {
      var partials = app.views.partials,
          src = partials.$method_with_context.toString();
      assert.equal(partials.$method.toString(), ob.method);
      assert.isTrue(src.indexOf('return func.apply(context, slice.call(arguments, 0));') >= 0);
    }
    
  },
  
  'Application::addClientResource': {
    
    "Properly sets client resources": function() {
      app._addClientResource('custom', {
        name: 'custom.resource',
        path: '/custom/resource.txt'
      });
      assert.isTrue(app.client.custom[0] && app.client.custom[0].name == 'custom.resource');
    }
    
  },
  
  'Application::getClientResource': {

    "Properly gets client resources": function() {
      var data = app._getClientResource('custom', 'custom.resource');
      assert.typeOf(data, 'object');
      assert.equal(data.name, 'custom.resource');
      assert.equal(data.path, '/custom/resource.txt');
    }

  },
  
  'Application::addClientScript': {
    
    "Properly gets client scripts": function() {
      var script, descriptor = {
        name: 'jquery',
        path: 'http://code.jquery.com/jquery-1.7.1.min.js'
      }
      
      app._addClientScript(descriptor);
      
      script = app._getClientResource('scripts', 'jquery');
      assert.deepEqual(script, descriptor);
    }    
    
  },
  
  'Application::addClientStylesheet': {

    "Properly gets client stylesheets": function() {
      var stylesheet, descriptor = {
        name: 'blueprint',
        path: 'http://blueprintcss.org/blueprint/screen.css'
      }
      
      app._addClientStylesheet(descriptor);
      
      stylesheet = app._getClientResource('stylesheets', 'blueprint');
      assert.deepEqual(stylesheet, descriptor);
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

      app.resources.my_resource = '{RESOURCE}';

      app._getResource('storages/redis', function(storage) {
        promise.emit('success', storage);
      });
      
      return promise;
    },
    
    'Gets {context}/{resource}': function() {
      var drv = app._getResource('context/alpha');
      assert.equal(drv.name, 'alpha');
    },
    
    'Gets {context}/{group}:{resource}': function() {
      var drv = app._getResource('context/beta:gamma');
      assert.equal(drv.name, 'gamma');
    },
    
    'Gets {resource}': function() {
      assert.equal(app._getResource('my_resource'), '{RESOURCE}');
    },
    
    'Works asynchronously if callback provided': function(storage) {
      assert.instanceOf(storage, corejs.storages.redis);
    }
    
  }
  
}).addBatch({
  
  'Application::curl': {
    
    topic: function() {
      
      // Handle the upcoming requests manually (prevent conflicts with engine tests)
      app.on('request', function(req, res) {
        if (req.url == '/request-test') {
          req.stopRoute();
          res.sendHeaders();
          res.end('SUCCESS');
        } else if (req.url == '/request-headers-test') {
          req.stopRoute();
          res.sendHeaders();
          res.end('x-custom-header' in req.headers ? 'SUCCESS' : 'FAIL');
        } else if (req.method == 'PUT' && req.url == '/') {
          req.stopRoute();
          res.statusCode = 400;
          res.sendHeaders();
          res.end('BAD REQUEST');
        }
      });
      
      var promise = new EventEmitter();
      multi.curl('/request-test');
      multi.curl('-X PUT /');
      multi.curl('-i http://google.com');
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      return promise;
    },
    
    'Returns valid data': function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.isTrue(r1 == 'SUCCESS');
      assert.isTrue(r2 == 'BAD REQUEST');
    },
    
    'Can access external URLs': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf("HTTP/1.1 301 Moved Permanently") >= 0);
      assert.isTrue(r.indexOf("Location: http://www.google.com/") >= 0);
    }
    
  }
  
}).addBatch({
  
  'Application::clientRequest': {
    
    topic: function() {
      var promise = new EventEmitter();
      multi.clientRequest('/request-test');
      multi.clientRequest({path: '/', method: 'PUT'});
      multi.clientRequest({
        path: '/request-headers-test', 
        method: 'GET', 
        headers: { 'x-custom-header': 1 }
      });
      multi.exec(function(err, results) {
        app.removeAllListeners('request'); // Remove `request` listeners (set on previous test case)
        promise.emit('success', err || results);
      });
      return promise;
    },
    
    'Returns valid responses & data': function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.equal(r1[0], 'SUCCESS');
      assert.equal(r1[1].status, '200 OK');
      assert.equal(r2[0], 'BAD REQUEST');
      assert.equal(r2[1].status, '400 Bad Request');
    },
    
    'Allows sending custom headers': function(results) {
      var r = results[2];
      assert.equal(r[0], 'SUCCESS');
      assert.equal(r[1].status, '200 OK');
    }
    
  }
  
}).export(module);
