
function CorejsMiddleware(config) {
  
  var app = corejs.app;
  
  // Don't attach to app singleton
  this.__noAttach = true;
  
  app.__LoadedFrameworkMiddleware = true;
  app.__FrameworkMiddlewareConfig = config;
  
}

module.exports = CorejsMiddleware;