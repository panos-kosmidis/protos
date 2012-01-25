
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;
    
var mysql, multi;

vows.describe('lib/drivers/mysql.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = new EventEmitter();
      app.on('init', function() {
        mysql = app.getResource('drivers/mysql');
        multi = mysql.multi({parallel: false, interrupt: false});
        promise.emit('success');
      });
      return promise;
    },

    'Sets config': function() {
      assert.isTrue(true);
    },
    
    'Sets client': function() {
      assert.isTrue(true);
    }

  }
  
}).export(module);
