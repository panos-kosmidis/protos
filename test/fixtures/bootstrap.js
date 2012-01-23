
var path = require('path'),
    rootPath = path.resolve(__dirname, '../../'),
    CoreJS = require(rootPath);

CoreJS.configure('autoCurl', false);

var testSkeleton = CoreJS.path + '/test/fixtures/test-skeleton',
    framework = CoreJS.bootstrap(testSkeleton, {}),
    app = framework.defaultApp;

framework.path = CoreJS.path + '/test/fixtures/test-framework';

module.exports = app;