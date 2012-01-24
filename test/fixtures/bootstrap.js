
var env, path = require('path'),
    rootPath = path.resolve(__dirname, '../../'),
    CoreJS = require(rootPath),
    testConfig = require(rootPath + '/test/config.json');

if (module.parent.id == '.') {
  // Running test directly
  env = path.basename(path.dirname(module.parent.filename));
} else {
  // Running test from makefile
  env = path.basename(path.dirname(module.parent.id));
}

console.exit(env);

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

module.exports = app;