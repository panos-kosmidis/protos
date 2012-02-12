
var app = corejs.app;

function ApplicationMiddleware(config, middleware) {
  
  app[middleware] = this; // Attach to application singleton
  
  app.__LoadedApplicationMiddleware = true;
  app.__ApplicationMiddlewareConfig = config;
  
}

module.exports = ApplicationMiddleware;