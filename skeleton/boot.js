
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
      app.debugLog = true; // Enable debug messages on development
    },
    production: function(app) {
      app.use('production_port'); // Use port 80 on production
    }
  },
  
  // Attach events
  events: {
    init: function(app) {
      // Load middleware before initialization
      app.use('logger');
    }
  }
  
});