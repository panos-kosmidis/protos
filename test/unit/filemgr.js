
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    FileManager = corejs.lib.filemgr,
    EventEmitter = require('events').EventEmitter;

var t = 100; // Time to wait for Disk I/O to complete

var files = {
  fileA: {path: app.fullPath('/incoming/a.txt'), size: 16},
  fileB: {path: app.fullPath('/incoming/b.txt'), size: 0},
  fileC: {path: app.fullPath('/incoming/c.txt'), size: 0},
}

// Simulates file uploads
function createFiles() {
  for (var file in files) {
    fs.writeFileSync(files[file].path, '', 'utf-8');
  }
}

var loggingStatus;

vows.describe('lib/filemgr.js').addBatch({
  
  'FileManager::expect': {
    
    topic: function() {
      
      loggingStatus = app.logging;
      
      app.logging = false;
      
      var fm, results = [],
          promise = new EventEmitter();
      
      // Using setTimeout to compensate for Disk I/O
      
      // Returns true + removes files not expected for optional files
      createFiles();
      fm = new FileManager(app, files);
      fm.__expectResult = fm.expect('fileC', 'fileX', {
        name: 'fileA', 
        required: true, 
        notEmpty: true
      },{
        name: 'fileB',
        required: true
      });
      
      setTimeout(function() {
        fm.__existChecks = [
          path.existsSync(files.fileA.path),
          path.existsSync(files.fileB.path),
          path.existsSync(files.fileC.path)];
        results.push(fm);
        
        // Returns false + removes all files when required file not present
        createFiles();
        fm = new FileManager(app, files);
        fm.__expectResult = fm.expect('*fileX', 'fileA', 'fileB');
        
        setTimeout(function() {
          fm.__existChecks = [
            path.existsSync(files.fileA.path),
            path.existsSync(files.fileB.path),
            path.existsSync(files.fileC.path)];
          results.push(fm);
          
          // Returns false + removes all files when required file empty
          createFiles();
          fm = new FileManager(app, files);
          fm.__expectResult = fm.expect('*fileA', '**fileB');

          setTimeout(function() {
            fm.__existChecks = [
              path.existsSync(files.fileA.path),
              path.existsSync(files.fileB.path),
              path.existsSync(files.fileC.path)];
            results.push(fm);
            
            promise.emit('success', results);
          }, t);
          
        }, t);
        
      }, t);
      
      return promise;
    },
    
    'Returns true + removes files not expected for optional files': function(results) {
      var fm = results[0];
      assert.isTrue(fm.__expectResult);
      assert.equal(fm.length,3);
      assert.deepEqual(Object.keys(fm.files), ['fileA', 'fileB', 'fileC']);
      assert.deepEqual(fm.__existChecks, [true, true, true]);
    },
    
    'Returns false + removes all files when required file not present': function(results) {
      var fm = results[1];
      assert.isFalse(fm.__expectResult);
      assert.equal(fm.length, 0);
      assert.deepEqual(Object.keys(fm.files), []);
      assert.deepEqual(fm.__existChecks, [false, false, false]);
    },
    
    'Returns false + removes all files when required file empty': function(results) {
      var fm = results[2];
      assert.isFalse(fm.__expectResult);
      assert.equal(fm.length, 0);
      assert.deepEqual(Object.keys(fm.files), []);
      assert.deepEqual(fm.__existChecks, [false, false, false]);
    }
    
  } 
    
}).addBatch({
  
  'FileManager::removeEmpty': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      createFiles();
      var fm = new FileManager(app, files);
      fm.removeEmpty();
      
      setTimeout(function() {
        fm.__existChecks = [
          path.existsSync(files.fileA.path),
          path.existsSync(files.fileB.path),
          path.existsSync(files.fileC.path) ];
        promise.emit('success', fm);
      }, t);
      
      return promise;
    },
    
    'Removes all empty files': function(fm) {
      assert.equal(fm.length, 1);
      assert.deepEqual(fm.__existChecks, [true, false, false]);
    }
    
  }
  
}).addBatch({
  
  'FileManager::removeAll': {
    
    topic: function() {
      var promise = new EventEmitter();

      var fm = new FileManager(app, files);
      fm.removeAll();

      setTimeout(function() {
        fm.__existChecks = [
          path.existsSync(files.fileA.path),
          path.existsSync(files.fileB.path),
          path.existsSync(files.fileC.path) ];
        promise.emit('success', fm);
      }, t);

      return promise;
    },

    'Removes all files': function(fm) {
      assert.equal(fm.length, 0);
      assert.deepEqual(fm.__existChecks, [false, false, false]);
    }
    
  }
  
}).addBatch({
  
  'FileManager::get': {
    
    topic: function() {
      var results = [];
      var fm = new FileManager(app, files);
      results.push(fm.get('fileA'));
      results.push(fm.get('fileX'));
      return results;
    },
    
    'Returns valid file object for existing files': function(results) {
      var r = results[0];
      assert.deepEqual(r, files.fileA);
    },
    
    'Returns undefined for inexistent files': function(results) {
      var r = results[1];
      assert.isUndefined(r);
    }
    
  }
  
}).addBatch({
  
  'FileManager::forEach': {
    
    topic: function() {
      
      app.logging = loggingStatus;
      
      var results = [];
      var fm = new FileManager(app, files);
      fm.forEach(function(file) {
        results.push(file);
      });
      return results;
    },
    
    'Iterates over the files contained': function(results) {
      assert.deepEqual(results, [files.fileA, files.fileB, files.fileC]);
    }
    
  }
  
}).export(module);
