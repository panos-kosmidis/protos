
var Protos = require('../');

Protos.bootstrap(__dirname, {
  
  // Server configuration
  server: {
    host: 'localhost',
    port: 8080,
    multiProcess: false,
    stayUp: false
  },
  
  // Application environments
  environments: {
    default: 'development',
    development: function(app) {
      app.debugLog = false;
    }
  },
  
  // Application events
  events: {
    init: function(app) {
      
      // Load middleware
      app.use('logger');
      app.use('markdown');
      app.use('body_parser');
      app.use('cookie_parser');
      app.use('static_server');
      
      // Load extensions in lib/
      app.libExtensions();

    }
  }
  
});

module.exports = protos.app;