
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var model;

vows.describe('Models').addBatch({

  'Preliminaries': {

    topic: function() {
      if (app.initialized) return app.models.users;
      else {
        var promise = new EventEmitter();
        app.on('init', function() {
          promise.emit('success', app.models.users);
        });
        return promise;
      }
    },

    'Initialized test model': function(model) {
      assert.isTrue(model instanceof framework.lib.model);
      assert.equal(model.className, 'UsersModel');
      assert.isTrue(model.driver instanceof framework.lib.driver)
      assert.equal(model.driver.className, 'MySQL');
    }

  }

}).addBatch({
  
  
  
}).export(module);