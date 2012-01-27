
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

var multi = app.createMulti(app);

app.addFilter('eco_template', function(data) {
  var key, engine,
      async = app.engines.eco.async,
      buf = '\n';
  for (key in app.engines) {
    engine = app.engines[key];
    // Skip async partials on sync engines
    if (async == false && engine.async == true) continue;
    buf += util.format('<%- @main_%s(@locals) %>\n', key);
  }
  return data + buf;
});

vows.describe('View Engines').addBatch({
  
  'Eco': {
    
    topic: function() {
      var promise = new EventEmitter();
      app.clientRequest('/eco.eco', function(err, buffer, headers) {
        promise.emit('success', err || {buffer: buffer, headers: headers});
      });
      return promise;
    },
    
    'Returns valid view buffer': function(results) {
      console.exit(results.buffer);
    }
    
  }
  
}).export(module);