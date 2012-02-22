
var app = require('../fixtures/bootstrap'),
    fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

var compiledLess, compiledStylus, compiledCoffee;

vows.describe('Asset Compiler (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Restore modified file before starting tests
      var restore = fs.readFileSync(app.fullPath('../stylus.styl'), 'utf8');
      fs.writeFileSync(app.fullPath('public/assets/stylus.styl'), restore, 'utf8');
      
      // Load dependencies
      if (!app.supports.static_server) app.use('static_server');
      
      if (!app.supports.asset_compiler) app.use('asset_compiler', {
        watchOn: [corejs.environment]
      });
     
      // Get pre-compiled files for comparison
      compiledLess = fs.readFileSync(app.fullPath('../compiled-assets/less.txt'), 'utf8');
      compiledStylus = fs.readFileSync(app.fullPath('../compiled-assets/stylus.txt'), 'utf8');
      compiledStylusModified = fs.readFileSync(app.fullPath('../compiled-assets/stylus2.txt'), 'utf8');
      compiledCoffee = fs.readFileSync(app.fullPath('../compiled-assets/coffee.txt'), 'utf8');
     
      // Forbids access to asset sources
      multi.curl('-i /assets/less.less');
      multi.curl('-i /assets/stylus.styl');
      multi.curl('-i /assets/coffee.coffee');
      
      // Successfully compiles LESS assets
      multi.curl('/assets/less.css');
      
      // Successfully compiles Stylus assets
      multi.curl('/assets/stylus.css');
      
      // Successfully compiles CoffeeScript assets
      multi.curl('/assets/coffee.js');
      
      

      multi.exec(function(err, results) {
        
        var p = app.fullPath('public/assets/stylus.styl');
        var styl = fs.readFileSync(p, 'utf8');
        styl = styl.replace('border-radius(5px)', 'border-radius(100px)');
        fs.writeFileSync(p, styl, 'utf8');
        
        setTimeout(function() {
          
          // Watches for changes of the source files (when enabled)
          
          app.curl('/assets/stylus.css', function(err, buf) {
            delete app.supports.static_server;
            results.push(err || buf);
            promise.emit('success', err || results);
          });
          
        }, 25);
        
        
      });
     
      return promise;
    },
    
    "Forbids access to asset sources": function(results) {
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2];
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r3.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    "Successfully compiles LESS assets": function(results) {
      var r = results[3];
      assert.equal(r, compiledLess);
    },
    
    "Successfully compiles Stylus assets": function(results) {
      var r = results[4];
      assert.equal(r, compiledStylus);
    },
    
    "Successfully compiles CoffeeScript assets": function(results) {
      var r = results[5];
      assert.equal(r, compiledCoffee);
    },
    
    "Watches for source file changes (when enabled)": function(results) {
      var r = results[6];
      assert.equal(r, compiledStylusModified);
    }
    
  }
  
}).export(module);