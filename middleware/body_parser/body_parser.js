
var app = corejs.app;

require('./request.js');

function BodyParser(config, middleware) {
  
  // Middleware configuration
  config = corejs.extend({
    maxFieldSize: 2 * 1024 * 1024,
    maxUploadSize: 2 * 1024 * 1024,
    keepUploadExtensions: true
  }, config);
  
  app.config.uploads = config;
  
}

module.exports = BodyParser;