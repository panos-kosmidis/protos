
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
    
  },
  
  'Utility::toCamelCase': {
    
    'Returns valid strings': function() {
      assert.strictEqual(framework.util.toCamelCase('my_test_suite'), 'MyTestSuite');
    }
    
  },
  
  'Utility::isTypeOf': {
    
    'Returns valid booleans': function() {
      assert.isTrue(framework.util.isTypeOf(99, 'number'));
      assert.isFalse(framework.util.isTypeOf(99, 'function'));
    }
    
  },
  
  'Utility::parseRange': {
    
    'Parses range strings': function() {
      
      function p(str) {
        return framework.util.parseRange(1000, 'bytes='+str);
      }
      
      assert.deepEqual(p('0-499'), [{start: 0, end: 499}]);
      assert.deepEqual(p('40-80'), [{start: 40, end: 80}]);
      assert.deepEqual(p('-500'), [{start: 500, end: 999}]);
      assert.deepEqual(p('-400'), [{start: 600, end: 999}]);
      assert.deepEqual(p('500-'), [{start: 500, end: 999}]);
      assert.deepEqual(p('400-'), [{start: 400, end: 999}]);
      assert.deepEqual(p('0-0'), [{start: 0, end: 0}]);
      assert.deepEqual(p('-1'), [{start: 999, end: 999}]);
    }
    
  },
  
  'Utility::searchPattern': {
    
    topic: function() {
      return framework.util.searchPattern;
    },
    
    'Detects single match w/ one find': function(f) {
      assert.deepEqual(f('hello world!', 'world'), {world: [6]});
    },
    
    'Detects single match w/ multiple finds': function(f) {
      assert.deepEqual(f('hello world!', ['o']), {o: [4,7]});
    },
    
    'Detects multiple matches w/ one find': function(f) {
      assert.deepEqual(f('hello world', ['o', 'hello']), {o: [4,7], hello: [0]});
    },
    
    'Detects multiple matches w/ multiple finds': function(f) {
      assert.deepEqual(f('hello world', ['o', 'l']), {o: [4,7], l: [2,3,9]});
    }
    
  }
  
}).export(module);