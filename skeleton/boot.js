
var CoreJS = require('../');

CoreJS.bootstrap(__dirname, {
  
  // Server configuration
  host: 'localhost',
  port: 8080,
  multiProcess: false,
  stayUp: false,
  redirect: false,
  
  // Environments
  environment: {
    default: 'development',
    development: function(app) {
      // Debug messages in development
      app.debugLog = false;
    },
    production: function(app) {
      // Use port 80 in production
      app.use('production_port'); 
    }
  },
  
  // Application events
  events: {
    init: function(app) {
      app.use('logger');
      app.use('body_parser');
      app.use('cookie_parser');
      app.use('static_server');
    }
  }
  
});