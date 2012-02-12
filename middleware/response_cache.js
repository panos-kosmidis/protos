
/*
  Response Caching
 */

var app = corejs.app;

function ResponseCache(config) {

  /* config = {
    storage: 'redis'
  } */
  
  var sto;
  
  // Don't attach this middleware into app singleton
  this.__noAttach = true;

  if (!config.storage) {
    throw new Error('A storage is required.');
  } else if (typeof config.storage == 'string') {
    sto = app.getResource('storages/' + config.storage);
  } else {
    sto = config.storage;
  }
  
  app.resources.response_cache = sto;
  
  app.debug('Response Cache enabled');
  
}

module.exports = ResponseCache;