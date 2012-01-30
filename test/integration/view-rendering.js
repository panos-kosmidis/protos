
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var OutgoingMessage = require('http').OutgoingMessage;

// Creates a new response
function newResponse() {
  // Simulate a response
  var res = new OutgoingMessage();
  res.__app = app;
  res.__controller = app.controller;
  return res;
}

// Returns a full view path
function vPath(p) {
  return app.fullPath('app/views/' + p);
}

var multi = app.createMulti();

vows.describe('View Rendering').addBatch({
  
  'OutgoingMessage::getViewPath': {
    
    topic: function() {
      return newResponse();
    },
    
    'Returns valid paths for aliases & filenames': function(res) {
      assert.strictEqual(res.getViewPath('index'), vPath('main/main-index.html'));
      assert.strictEqual(res.getViewPath('index.html'), vPath('main/index.html'));
    },

    'Returns valid paths for @layout views': function(res) {
      assert.strictEqual(res.getViewPath('@header'), vPath('__layout/header.mustache'));
      assert.strictEqual(res.getViewPath('@header.html'), vPath('__layout/header.html'));
      assert.strictEqual(res.getViewPath('@dir/view'), vPath('__layout/dir/view.mustache'));
      assert.strictEqual(res.getViewPath('@dir/view.html'), vPath('__layout/dir/view.html'));
    },
    
    'Returns valid paths for #restricted views': function(res) {
      assert.strictEqual(res.getViewPath('#404'), vPath('__restricted/404.mustache'));
      assert.strictEqual(res.getViewPath('#404.html'), vPath('__restricted/404.html'));
      assert.strictEqual(res.getViewPath('#dir/view'), vPath('__restricted/dir/view.mustache'));
      assert.strictEqual(res.getViewPath('#dir/view.html'), vPath('__restricted/dir/view.html'));
    },
    
    'Returns valid paths relative to views/': function(res) {
      assert.strictEqual(res.getViewPath('main/index'), vPath('main/main-index.html'));
      assert.strictEqual(res.getViewPath('/main/index'), vPath('main/main-index.html'));
      assert.strictEqual(res.getViewPath('main/index.html'), vPath('main/index.html'));
    },
    
    'Returns valid paths for static views': function(res) {
      assert.strictEqual(res.getViewPath('/static'), vPath('__static/static.html'));
      assert.strictEqual(res.getViewPath('/static.mustache'), vPath('__static/static.mustache'));
    }
    
  }
  
}).addBatch({
  
  'OutgoingMessage::rawHttpMessage': {
    
    '» When Raw Views is off': {
      
      topic: function() {

        // Temporarily disable filters
        var filtersBackup = app.__filters;
        app.__filters = {};

        app.on('request', function(req, res) {
          req.stopRoute();
          switch (req.url) {
            case '/bad-request':
              res.statusCode = 400;
              res.sendHeaders();
              app.badRequest(res);
              break;
            case '/not-found':
              res.statusCode = 404;
              res.sendHeaders();
              app.notFound(res);
              break;
            case '/server-error':
              res.statusCode = 500;
              res.sendHeaders();
              app.serverError(res);
              break;
            case '/raw-server-error':
              res.statusCode = 500;
              res.sendHeaders();
              app.rawServerError(res, '{HTTP/500 ERROR}');
              break;
            case '/raw-http-message':
              res.sendHeaders();
              res.rawHttpMessage('{RAW MESSAGE}');
              break;
          }
        });
        
        var promise = new EventEmitter();
        
        app.config.rawViews = true;
        
        multi.clientRequest('/bad-request');
        multi.clientRequest('/not-found');
        multi.clientRequest('/server-error');
        multi.clientRequest('/raw-server-error');
        multi.clientRequest('/raw-http-message');
        
        multi.exec(function(err, results) {
          app.removeAllListeners('request');
          app.__filters = filtersBackup;
          promise.emit('success', err || results);
        });
        
        return promise;
      },
      
      'Application::badRequest works properly': function(results) {
        var res = results[0], buf = res[0], hdr = res[1];
        assert.equal(buf.trim(), '<p>400 Bad Request</p>');
        assert.equal(hdr.status, '400 Bad Request');
      },
      
      'Application::notFound works properly': function(results) {
        var res = results[1], buf = res[0], hdr = res[1];
        assert.equal(buf.trim(), '<p>HTTP/404: Page not Found</p>');
        assert.equal(hdr.status, '404 Not Found');
      },
      
      'Application::serverError works properly': function(results) {
        var res = results[2], buf = res[0], hdr = res[1];
        assert.equal(buf.trim(), '<p>HTTP/500: Internal Server Error</p>');
        assert.equal(hdr.status, '500 Internal Server Error');
      },
      
      'Application::rawServerError works properly': function(results) {
        var res = results[3], buf = res[0], hdr = res[1];
        assert.equal(buf.trim(), '<p>{HTTP/500 ERROR}</p>');
        assert.equal(hdr.status, '500 Internal Server Error');
      },
      
      'Application::rawHttpMessage works properly': function(results) {
        var res = results[4], buf = res[0], hdr = res[1];
        assert.equal(buf.trim(), '<p>{RAW MESSAGE}</p>');
        assert.equal(hdr.status, '200 OK');
      },
      
    }
    
  }
  
}).export(module);
