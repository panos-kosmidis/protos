
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');
    
vows.describe('Production URL (middleware)').addBatch({
  
  "Removes port from app.baseUrl": function() {
    var oldUrl = app.baseUrl;
    app.use('production_url');
    assert.equal(app.baseUrl, 'http://' + app.hostname);
    app.baseUrl = oldUrl;
  }
  
}).export(module);