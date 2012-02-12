
var app = corejs.app;

function CorejsMiddleware(config) {
  
  app.__LoadedFrameworkMiddleware = true;
  app.__FrameworkMiddlewareConfig = config;
  
}

module.exports = CorejsMiddleware;