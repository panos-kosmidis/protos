
var CoreJS = require('../');

CoreJS.bootstrap(__dirname, {
  
  host: 'localhost',
  port: 8080,
  multiProcess: false,
  stayUp: false,
  redirect: 'http://google.com',
  
  environment: {
    default: 'development',
    production: function(app) {
      // Use port 80 on production
      app.use('production_port');
    }
  },
  
  // Attach events
  events: {},
  
  // Load middleware
  middleware: {}
  
});