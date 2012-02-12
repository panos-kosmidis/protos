
function ApplicationAddon(app, config) {
  
  app.__LoadedApplicationMiddleware = true;
  app.__ApplicationMiddlewareConfig = config;
  
}

module.exports = ApplicationAddon;