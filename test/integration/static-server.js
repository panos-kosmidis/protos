
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

vows.describe('Static File Server').addBatch({
  
  '': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      app.__filterBackup = app.__filters;
      app.__filters = {};
      
      multi.curl('-i /hello.txt');                    // file in root level
      multi.curl('-i /dir/file.txt');                 // file in subdir, level 1
      multi.curl('-i /dir/subdir/sub.txt');           // file in subdir, level 2
      multi.curl('-i /blog/post.txt');                // file in subdir, matches controller name
      multi.curl('-i /missing.txt');                  // missing file, root level
      multi.curl('-i /this/is/missing.txt');          // missing file, level 1
      multi.curl('-i /this/is/missing/file.txt');     // missing file, level 2
      multi.curl('-i /.missing-file');                // hidden file, root level (nonexistent)
      multi.curl('-i /dir/.missing-file');            // hidden file, level 1 (nonexistent)
      multi.curl('-i /.hidden-file');                 // hidden file, root level
      multi.curl('-i /dir/.hidden-file');             // hidden file, level 1

      // Partial content
      multi.curl('-i --range "5-" /ranges.txt');      // partial file request, valid
      multi.curl('-i --range "5-1" /ranges.txt');     // partial file request, invalid
      
      multi.exec(function(err, results) {
        app.__filters = app.__filterBackup;
        results = results.map(function(r) {
          return r.trim().split(/\r\n/);
        });
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Get files in public/ » root level': function(results) {
      var r = results[0];
      assert.isTrue(r.indexOf('Status: 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Length: 11') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/plain') >= 0);
      assert.equal(r.pop(), '{hello.txt}');
    },

    'Gets files in public/ » 1 level deep': function(results) {
      var r = results[1];
      assert.isTrue(r.indexOf('Status: 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Length: 14') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/plain') >= 0);
      assert.equal(r.pop(), '{dir/file.txt}');
    },
    
    'Gets files in public/ » 2 levels deep (and up)': function(results) {
      var r = results[2];
      assert.isTrue(r.indexOf('Status: 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Length: 20') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/plain') >= 0);
      assert.equal(r.pop(), '{dir/subdir/sub.txt}');
    },
    
    'Do not conflict with controllers': function(results) {
      var r = results[3];
      assert.isTrue(r.indexOf('Status: 200 OK') >= 0);
      assert.isTrue(r.indexOf('Content-Length: 15') >= 0);
      assert.isTrue(r.indexOf('Content-Type: text/plain') >= 0);
      assert.equal(r.pop(), '{blog/post.txt}');
    },
    
    'Properly reports HTTP/404 for missing files': function(results) {
      var r1 = results[4],
          r2 = results[5],
          r3 = results[6];
      assert.equal(r1[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r2[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r3[0], 'HTTP/1.1 404 Not Found');
    },
    
    'Access to hidden files is denied': function(results) {
      var r1 = results[7],
          r2 = results[8],
          r3 = results[9],
          r4 = results[10];
      assert.equal(r1[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r2[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r3[0], 'HTTP/1.1 404 Not Found');
      assert.equal(r4[0], 'HTTP/1.1 404 Not Found');
    },
    
    'Responds with valid headers for partial content requests': function(results) {
      var r1 = results[11], // HTTP/1.1 206 Partial Content
          r2 = results[12]; // HTTP/1.1 416 Requested Range Not Satisfiable
      assert.isTrue(r1.indexOf('HTTP/1.1 206 Partial Content') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 416 Requested Range Not Satisfiable') >= 0);
    }
    
  }
  
}).export(module);