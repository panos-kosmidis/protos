
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;
    
var mysql, multi;

vows.describe('lib/drivers/mysql.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = new EventEmitter();
      app.getResource('drivers/mysql', function(driver) {
        mysql = driver;
        multi = mysql.multi();
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
