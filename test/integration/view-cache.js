
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    OutgoingMessage = require('http').OutgoingMessage;

var enabledBatch = 'When View Caching is enabled',
    disabledBatch = 'When View Caching is disabled',
    batch = {};
    
var current = batch[enabledBatch] = {};
batch[disabledBatch] = {};

// ViewCaching enabled
app.viewCaching = true;
var counter = 0, 
    results = [],
    viewCache = app.views.callbacks;

Object.keys(app.engines).map(function(eng) {
  var engine = app.engines[eng],
      res = new OutgoingMessage; // Simulate response
  res.engine = engine;
  current[util.format('%s engine caches callbacks', engine.className)] = function() {
    var relPath = '/myview/'+ (++counter);
        out = engine.render('SUCCESS', {res: res}, relPath);
    results.push(out);
    var cb = viewCache[relPath];
    assert.isFunction(cb);
    assert.isString(cb.engine);
    assert.equal(cb.engine, engine.className);
  }
});

vows.describe('View Caching').addBatch(batch).export(module);