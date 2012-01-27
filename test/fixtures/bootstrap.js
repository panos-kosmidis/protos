
var env, path = require('path'),
    vows = require('vows'),
    assert = require('assert'),
    rootPath = path.resolve(__dirname, '../../'),
    testConfig = require(rootPath + '/test/fixtures/dbconfig.json')
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

CoreJS.on('app_init', function(app) {
  app.config.database.mysql = testConfig.mysql;
  app.config.storage.redis = testConfig.redis;
});

var testSkeleton = CoreJS.path + '/test/fixtures/test-skeleton',
    framework = CoreJS.bootstrap(testSkeleton, {}),
    app = framework.defaultApp;
    
app.logging = false;

framework.path = CoreJS.path + '/test/fixtures/test-framework';

// Extend assert to check view engine compatibility

var engines = Object.keys(app.engines),
    colorize = framework.util.colorize;

/* Test Engine Automation */

// Automate engine compatibility checks

function engineCompatibility(buffer, __engine__) {
  var pass, checks = [], failed = [], notCompatible = [];
  
  // Support for callbacks
  if (buffer.indexOf('hello'.link('google.com')) >= 0) {
    console.log('    ✓ ' + colorize('Supports JavaScript functions', '0;32'));
  } else {
    console.log('    ✗ ' + colorize('Does not support JavaScript functions', '0;36'));
  }
  
  for (var engine,i=0; i < engines.length; i++) {
    engine = engines[i];
    pass = buffer.indexOf('Rendered Partial: ' + engine.toUpperCase()) >= 0;
    checks.push(pass);
    if (pass) console.log('    ✓ ' + colorize('Compatible with ' + engine, '0;32'));
    else {
      failed.push(engine);
      console.log('    ✗ ' + colorize('Not Compatible with ' + engine, '0;36'));
    }
  }
  
  if (app.engines[__engine__].async == false && failed.length > 0) {
    for (i=0; i < failed.length; i++) {
      engine = failed[i];
      if (app.engines[engine].async == true) {
        // Async engines can't work on sync engines
        notCompatible.push(engines.indexOf(engine));
      }
    }
  }
  
  for (i=0; i < engines.length; i++) {
    if (notCompatible.indexOf(i) >= 0) continue;
    else assert.isTrue(checks[i]);
  }
}

// Automate engine tests

// engines = ['swig'];

app.__addEnginePartials = function(current, data, repl) {
  app.logging = true;
  var buf = engines.map(function(engine) {
    if (app.engines[current].async == false && app.engines[engine].async) return '';
    else {
      return repl.replace(/%s/g, engine) + '\n';
    }
  });
  data += '\n' + buf.join('');
  // console.exit(data);
  return data;
}

// Automate vows batches for test engines

app.__createEngineBatch = function(className, engine, testUrl, __module__) {
  
  vows.describe(className + ' Template Engine').addBatch({

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
        assert.isTrue(buffer.indexOf(className + ' Template Engine') >= 0);
      },
      
      'Supports partials from self & other engines': function(buffer) {
        engineCompatibility(buffer, engine);
      }

    }

  }).export(__module__);
  
}

module.exports = app;