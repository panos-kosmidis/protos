
function Initialize(app) {

  app.debugMode = true;
  app.enable('response_cache', 'redis');
  
}

module.exports = Initialize;