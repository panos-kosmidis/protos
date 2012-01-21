
var path = require('path'),
    rootPath = path.resolve(__dirname, '../../'),
    CoreJS = require(rootPath);
    
CoreJS.bootstrap(rootPath + '/skeleton', {
  host: 'localhost',
  port: '8080'
});