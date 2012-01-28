
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    OutgoingMessage = require('http').OutgoingMessage;

var enabledBatch = 'When Enabled',
    disabledBatch = 'When Disabled',
    batch = {};
    
var current = batch[enabledBatch] = {};
batch[disabledBatch] = {};

// Prevent conflicts
var oldViewCache = app.views.callbacks;
app.views.callbacks = {};

// ViewCaching enabled
app.viewCaching = true;
var counter = 0;

Object.keys(app.engines).map(function(eng) {
  var engine = app.engines[eng],
      res = new OutgoingMessage; // Simulate response
  res.engine = engine;
  current[util.format('%s engine caches callbacks', engine.className)] = function() {
    var relPath = '/myview/'+ (++counter);
    engine.render('', {res: res}, relPath);
    var cb = app.views.callbacks[relPath];
    assert.isFunction(cb);
    assert.equal(cb.engine, engine.className);
  }
});

current['Reset view cache state'] = function() {
  app.viewCaching = false;
  counter = 0;
  app.views.callbacks = {};
}

// ViewCaching disabled
current = batch[disabledBatch];
Object.keys(app.engines).map(function(eng) {
  var engine = app.engines[eng],
      res = new OutgoingMessage;
  res.engine = engine;
  current[util.format('%s engine does not cache callbacks', engine.className)] = function() {
    var relPath = '/myview/'+ (++counter);
    engine.render('HELLO', {res: res}, relPath);
    var cb = app.views.callbacks[relPath];
    assert.isUndefined(cb);
  }
});

current['Restored view cache state'] = function() {
  app.views.callbacks = oldViewCache;
}

// last check

vows.describe('View Caching').addBatch(batch).export(module);