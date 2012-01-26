
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert');

var OutgoingMessage = require('http').OutgoingMessage;

// Simulate a response
var res = new OutgoingMessage();
res.__app = app;
res.__controller = app.controller;

// Returns a full view path
function vPath(p) {
  return app.fullPath('app/views/' + p);
}

vows.describe('View Rendering').addBatch({
  
  'OutgoingMessage::getViewPath': {
    
    'Returns valid paths for aliases & filenames': function() {
      assert.strictEqual(res.getViewPath('index'), vPath('main/main-index.html'));
      assert.strictEqual(res.getViewPath('index.html'), vPath('main/index.html'));
    },

    'Returns valid paths for @layout views': function() {
      assert.strictEqual(res.getViewPath('@header'), vPath('__layout/header.mustache'));
      assert.strictEqual(res.getViewPath('@header.html'), vPath('__layout/header.html'));
      assert.strictEqual(res.getViewPath('@dir/view'), vPath('__layout/dir/view.mustache'));
      assert.strictEqual(res.getViewPath('@dir/view.html'), vPath('__layout/dir/view.html'));
    },
    
    'Returns valid paths for #restricted views': function() {
      assert.strictEqual(res.getViewPath('#404'), vPath('__restricted/404.mustache'));
      assert.strictEqual(res.getViewPath('#404.html'), vPath('__restricted/404.html'));
      assert.strictEqual(res.getViewPath('#dir/view'), vPath('__restricted/dir/view.mustache'));
      assert.strictEqual(res.getViewPath('#dir/view.html'), vPath('__restricted/dir/view.html'));
    },
    
    'Returns valid paths relative to views/': function() {
      assert.strictEqual(res.getViewPath('main/index'), vPath('main/main-index.html'));
      assert.strictEqual(res.getViewPath('/main/index'), vPath('main/main-index.html'));
      assert.strictEqual(res.getViewPath('main/index.html'), vPath('main/index.html'));
    },
    
    'Returns valid paths for static views': function() {
      assert.strictEqual(res.getViewPath('/static'), vPath('__static/static.html'));
      assert.strictEqual(res.getViewPath('/static.mustache'), vPath('__static/static.mustache'));
    }
    
  }
  
}).export(module);