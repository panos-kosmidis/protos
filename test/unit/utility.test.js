
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');
    
vows.describe('lib/utility.js').addBatch({
  
  'Utility::typecast': {
    
    topic: function() {
      return framework.util.typecast;
    },
    
    'Converts integer': function(f) {
      assert.isTrue(f('5') === 5);
    },
    
    'Converts float': function(f) {
      assert.isTrue(f('2.3') === 2.3)
    },
    
    'Converts null': function(f) {
      assert.isNull(f('null'));
    },
    
    'Converts boolean': function(f) {
      assert. isTrue(f('true'));
    }
    
  }
  
}).export(module);