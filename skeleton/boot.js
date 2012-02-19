
var CoreJS = require('../');

CoreJS.bootstrap(__dirname, {
  
  // Server configuration
  server: {
    host: 'localhost',
    port: 8080,
    multiProcess: false,
    stayUp: false,
    inspector_port: 3000
  },
  
  // Application environments
  environment: {
    default: 'development',
    development: function(app) {
      app.debugLog = false;
    },
    production: function(app) {
      app.use('production_url');
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