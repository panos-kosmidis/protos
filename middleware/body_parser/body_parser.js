
/* Body Parser */

var app = corejs.app;

require('./request.js');
require('./controller.js');

function BodyParser(config, middleware) {
  
  // Middleware configuration
  config = corejs.extend({
    maxFieldSize: 2 * 1024 * 1024,
    maxUploadSize: 2 * 1024 * 1024,
    keepUploadExtensions: true
  }, config);
  
  // Attach config to application
  app.config.uploads = config;
  
  // Register middleware resources
  app.resources[middleware] = {
    file_manager: require('./file_manager.js')
  }
  
  app.debug('Body Parser enabled');
  
}

module.exports = BodyParser;