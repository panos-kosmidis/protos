
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert');

var enabledBatch = 'When View Caching is enabled',
    disabledBatch = 'When View Caching is disabled',
    batch = {};
    
var current = batch[enabledBatch] = {};
batch[disabledBatch] = {};

// ViewCaching enabled
app.viewCaching = true;
var counter = 1;
Object.keys(app.engines).slice(0,1).map(function(eng) {
  var engine = app.engines[eng];
  current[util.format('%s successfully caches callbacks', engine.className)] = function() {
    var func = engine.render('', {}, '/myview');
    console.exit(func);
  }
  counter++;
});

vows.describe('View Caching').addBatch(batch).export(module);