
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

function engineCompatibility(buffer) {
  var pass, checks = [];
  for (var engine,i=0; i < engines.length; i++) {
    engine = engines[i];
    pass = buffer.indexOf('Rendered Partial: ' + engine.toUpperCase()) >= 0;
    checks.push(pass);
    if (pass) console.log('    ✓ ' + colorize('Compatible with ' + engine, '0;33'));
    else console.log('    ✗ ' + colorize('Not Compatible with ' + engine, '0;36'));
  }
  for (i=0; i < engines.length; i++) {
    return assert.isTrue(checks[i]);
  }
}

// Automate engine tests

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

app.__createEngineBatch = function(className, testUrl, __module__) {
  
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
        engineCompatibility(buffer);
      }

    }

  }).export(__module__);
  
}

module.exports = app;