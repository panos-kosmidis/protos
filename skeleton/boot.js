
var CoreJS = require('../');

CoreJS.bootstrap(__dirname, {
  host: 'localhost',
  port: 8080,
  environment: 'development',
  multiProcess: false,
  stayUp: false,
  redirect: false,
  events: {}
});