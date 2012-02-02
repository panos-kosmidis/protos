
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

multi.on('pre_exec', app.backupFilters);
multi.on('post_exec', app.restoreFilters);

vows.describe('Static File Server').addBatch({
  
  '': {
    
    topic: function() {
      var promise = new EventEmitter();
      
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
      multi.clientRequest({                           // partial file request, valid
        path: '/ranges.txt',
        headers: { Range: 'bytes=5-' }
      });
      
      multi.clientRequest({                           // partial file request, invalid
        path: '/ranges.txt',
        headers: { Range: 'bytes=5-1' }
      });
      
      multi.exec(function(err, results) {
        if (err) throw err;
        results = results.map(function(r) {
          try { return r.trim().split(/\r\n/); }
          catch(e) { return r; }
        });
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Gets files in public/ » root level': function(results) {
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
    
    'Does not conflict with controllers': function(results) {
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
    
    'Denies access to hidden files': function(results) {
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
      assert.equal(r1[0], 'fghijklmnopqrstuvwxyzfghij');
      assert.equal(r1[1].status, '206 Partial Content');
      assert.equal(r2[0], '');
      assert.equal(r2[1].status, '416 Requested Range Not Satisfiable');
    }
    
  }
  
}).export(module);