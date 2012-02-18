
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
      app.debugLog = true;
    }
    production: function(app) {
      app.use('production_port'); // Use port 80 on production
    }
  },
  
  // Attach events
  events: {},
  
  // Load middleware
  middleware: {
    static_server: {},
    body_parser: {},
    mailer: {},
    logger: {},
  }
  
});