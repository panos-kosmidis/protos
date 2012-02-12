
function FrameworkAddon(app, config) {
  
  app.__LoadedFrameworkMiddleware = true;
  app.__FrameworkMiddlewareConfig = config;
  
}

module.exports = FrameworkAddon;