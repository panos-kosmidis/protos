
var CoreJS = require('../');

CoreJS.bootstrap(__dirname, {
  
  /* Host Configuration */
  host: 'localhost',
  port: 8080,
  multiProcess: false,
  stayUp: false,
  
  /* Automatic Redirection */
  redirect: false,
  
  /* Environment Configuration */
  environment: {
    
    /* Default Environment */
    default: 'development',
    
    /* Production Environment code */
    production: function(app) {
      // Use port 80 on production
      app.use('production_port');
    }

  },
  
  /* Event Hooks */
  events: {
    // init: function(app) {
    //   app.log('Application initialized!');
    // }
  },
  
  /* Load Middleware */
  middleware: {
    // session: {storage: 'redis', guestSessions: true};
    // response_cache: {storage: 'redis'};
  }
  
});