
var CoreJS = require('../');

CoreJS.bootstrap(__dirname, {
  
  host: 'localhost',
  port: 8080,
  multiProcess: false,
  stayUp: false,
  redirect: false,
  
  environment: {
    default: 'development',
    production: function(app) {
      app.use('production_port'); // Use port 80 on production
    }
  },
  
  // Attach events
  events: {},
  
  // Load middleware
  middleware: {}
  
});