
// Sample test case:
// https://gist.github.com/1738905

var env, path = require('path'),
    vows = require('vows'),
    assert = require('assert'),
    rootPath = path.resolve(__dirname, '../../'),
    testConfig = require(rootPath + '/test/fixtures/dbconfig.json'),
    CoreJS = require(rootPath),
    EventEmitter = require('events').EventEmitter;

if (module.parent.id == '.') {
  // Running test directly
  env = path.basename(path.dirname(module.parent.filename));
} else {
  // Running test from makefile
  env = path.basename(path.dirname(module.parent.id));
}

CoreJS.configure('autoCurl', false);

CoreJS.on('pre_init', function(app) {
  app.config.database.default = 'mysql';
  app.config.database.mysql = testConfig.mysql;
  app.config.storage.redis = testConfig.redis;
});

CoreJS.on('bootstrap_config', function(bootstrap) {
  // For debugging purposes
  // console.log(bootstrap);
});

var testSkeleton = CoreJS.path + '/test/fixtures/test-skeleton',
    corejs = CoreJS.bootstrap(testSkeleton, {
      // redirect: 'http://corejs.org',
      events: {
        init: function(app) {
          app.__initBootstrapEvent = true;
        }
      }
    }),
    app = corejs.app;

app.logging = false;

corejs.path = CoreJS.path + '/test/fixtures/test-corejs';

// Extend assert to check view engine compatibility

var engines = Object.keys(app.engines),
    colorize = corejs.util.colorize;

/* Prevent conflicts with template engine test filters */

var filterBackup;

app.backupFilters = function() {
  filterBackup = app.__filters;
  app.__filters = {};
}

app.restoreFilters = function() {
  app.__filters = filterBackup;
}

/* Test Engine Automation */

// Automate engine compatibility checks

function engineCompatibility(buffer, __engine__) {
  var pass, checks = [], failed = [], notCompatible = [],
      helperPropertyRegex = /<p>99(\s+)?<\/p>/;
  
  // Support for callbacks
  if (buffer.indexOf('hello'.link('google.com')) >= 0) {
    console.log('    ✓ ' + colorize('Supports function calls', '0;32'));
  } else {
    console.log('    ✗ ' + colorize('Does not support function calls', '0;33'));
  }
  
  // Support for helper properties
  if (helperPropertyRegex.test(buffer)) {
    console.log('    ✓ ' + colorize('Supports helper properties', '0;32'));
  } else {
    console.log('    ✗ ' + colorize('Does not support helper properties', '0;33'));
  }
  
  for (var engine,i=0; i < engines.length; i++) {
    engine = engines[i];
    pass = buffer.indexOf('Rendered Partial: ' + engine.toUpperCase()) >= 0;
    checks.push(pass);
    if (pass) console.log('    ✓ ' + colorize('Compatible with ' + engine, '0;32'));
    else {
      failed.push(engine);
      console.log('    ✗ ' + colorize('Not Compatible with ' + engine, '0;33'));
    }
  }
  
  if (app.engines[__engine__].async === false && failed.length > 0) {
    for (i=0; i < failed.length; i++) {
      engine = failed[i];
      if (app.engines[engine].async === true) {
        // Async engines can't work on sync engines
        notCompatible.push(engines.indexOf(engine));
      }
    }
  }
  
}

// Automate engine tests

// engines = ['swig'];

app.addEnginePartials = function(current, data, repl) {
  app.logging = true;
  var buf = engines.map(function(engine) {
    if (app.engines[current].async === false && app.engines[engine].async) return '';
    else {
      return repl.replace(/%s/g, engine) + '\n';
    }
  });
  data += '\n' + buf.join('');
  return data;
}

// Automate vows batches for test engines

app.createEngineBatch = function(className, engine, testUrl, __module__) {
  
  vows.describe(className + ' Rendering Engine').addBatch({

    '': {

      topic: function() {
        var promise = new EventEmitter();
        app.clientRequest(testUrl  , function(err, buffer, headers) {
          // console.exit(buffer);
          promise.emit('success', err || buffer);
        });
        return promise;
      },

      'Returns valid view buffer': function(buffer) {
        // console.exit(buffer);
        assert.isTrue(buffer.indexOf(className + ' Template Engine') >= 0);
        engineCompatibility(buffer, engine);
      }

    }

  }).export(__module__);
  
}

module.exports = app;