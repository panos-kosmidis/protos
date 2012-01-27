
var env, path = require('path'),
    assert = require('assert'),
    rootPath = path.resolve(__dirname, '../../'),
    CoreJS = require(rootPath),
    testConfig = require(rootPath + '/test/fixtures/dbconfig.json');

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

assert.engineCompatibility = function(buffer) {
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


module.exports = app;