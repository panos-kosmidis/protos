
function ApplicationMiddleware(config) {
  
  var app = corejs.app;

  app.__LoadedApplicationMiddleware = true;
  app.__ApplicationMiddlewareConfig = config;
  
}

module.exports = ApplicationMiddleware;