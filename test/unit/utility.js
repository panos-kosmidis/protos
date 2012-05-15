
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    net = require('net'),
    EventEmitter = require('events').EventEmitter;

app.logging = false;

vows.describe('lib/utility.js').addBatch({
  
  'Utility::typecast': {
    
    topic: function() {
      return protos.util.typecast;
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
      assert.strictEqual(protos.util.toCamelCase('my_test_suite'), 'MyTestSuite');
    }
    
  },
  
  'Utility::parseRange': {
    
    'Parses range strings': function() {
      
      function p(str) {
        return protos.util.parseRange(1000, 'bytes='+str);
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
      return protos.util.searchPattern;
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
    
  },
  
  'Utility::extract': {
    
    'Returns an object with the extracted keys': function() {
      assert.deepEqual(protos.util.extract({a:1, b:2, c:3}, ['a','b']), {a:1, b:2});
    }
    
  }
  
}).addBatch({
  
  'Utility::checkPort': {
    
    topic: function() {
      var promise = new EventEmitter(),
          errors = [],
          port = 9999,
          server = net.createServer().listen(port); // listen on 9999;
      // Check port when server is listening
      protos.util.checkPort(port, function(err) {
        errors.push(err); // err1
        // Emitted when server closes
        server.on('close', function(err) {
          protos.util.checkPort(port, function(err) {
            errors.push(err); // err2
            promise.emit('success', errors); // Send topic
          });
        });
        // Close server. Emits the 'close' event
        server.close();
      });
      return promise;
    },
    
    'Detects if a port is in use': function(err) {
      err = err[0];
      assert.isNull(err); // If err1 is null => open port
    },
    
    'Detects if a port is not in use': function(err) {
      err = err[1];
      assert.isTrue(err instanceof Error && err.code == 'ECONNREFUSED'); // If err2 is Error => closed port
    }
    
  }
  
}).addBatch({
  
  'Utility::createRegexPattern': {
    
    topic: function() {
      
      var regexes = []
      regexes.push(protos.util.createRegexPattern('*.css'));
      regexes.push(protos.util.createRegexPattern('*.(css|js)'));
      regexes.push(protos.util.createRegexPattern('hello/[xyz][a-b]{1}[aeiou]{1,3}*.(css|js)'));
      regexes.push(protos.util.createRegexPattern('hello-world/hi\\+there/whoah!.(html|php)'));
      regexes.push(protos.util.createRegexPattern('hi+there'));
      
      return regexes;
    }, 
    
    'Creates valid regexp objects': function(regexes) {
      var typeCheck = regexes.map(function(ob) { return ob instanceof RegExp; });
      assert.deepEqual(typeCheck, [true, true, true, true, true]);
    },
    
    'Creates regexes properly': function(regexes) {
      var regexes = regexes.map(function(ob) { return ob.toString(); });
      assert.strictEqual(regexes[0], '/^(.+)\\.css$/');
      assert.strictEqual(regexes[1], '/^(.+)\\.(css|js)$/');
      assert.strictEqual(regexes[2], '/^hello/[xyz][a-b]{1}[aeiou]{1,3}(.+)\\.(css|js)$/');
      assert.strictEqual(regexes[3], '/^hello-world/hi\\+there/whoah!\\.(html|php)$/');
      assert.strictEqual(regexes[4], '/^hi+there$/');
    },
    
    'Patterns are matched successfully': function(regexes) {
      // *.css
      assert.isTrue(regexes[0].test('hello.css'));
      assert.isTrue(regexes[0].test('yeah!.css'));
      assert.isTrue(regexes[0].test('c++.css'));
      assert.isFalse(regexes[0].test('hello-world.less'));
      assert.isFalse(regexes[0].test('c++.styl'));
      
      // *.(css|js)
      assert.isTrue(regexes[1].test('hello.css'));
      assert.isTrue(regexes[1].test('hello-world.css'));
      assert.isTrue(regexes[1].test('hi!.css'));
      assert.isTrue(regexes[1].test('whoah.js'));
      assert.isFalse(regexes[1].test('cool.html'));
      assert.isFalse(regexes[1].test('hi.php'));
      
      // hello/[xyz][a-b]{1}[aeiou]{1,3}*.(css|js)
      assert.isTrue(regexes[2].test('hello/xaeCOOL.css'));
      assert.isFalse(regexes[2].test('hello/xaeCOOL.html'));
      assert.isTrue(regexes[2].test('hello/ybi!.js'));
      assert.isFalse(regexes[2].test('hello/ybi!.php'));
      assert.isFalse(regexes[2].test('hello/anxq.css'));
      
      // /^hello-world/hi\+there/whoah!\\.(html|php)$/
      assert.isTrue(regexes[3].test('hello-world/hi+there/whoah!.html'));
      assert.isFalse(regexes[3].test('hello-world/hi+there/whoah.css'));
      
      // /^hi+there$/
      assert.isTrue(regexes[4].test('hiiiiiiiiiiiiiiiiithere'));
      assert.isFalse(regexes[4].test('hi+there'));
    },
    
    'Accepts an array of patterns (recursive)': function() {
      var patterns = protos.util.createRegexPattern(['hello*.css', 'assets/css/img.(jpg|png|gif)', 'you/(like|eat)/(apples|bananas).txt']);
      assert.isArray(patterns);
      assert.strictEqual(patterns[0].toString(), '/^hello(.+)\\.css$/');
      assert.strictEqual(patterns[1].toString(), '/^assets/css/img\\.(jpg|png|gif)$/');
      assert.strictEqual(patterns[2].toString(), '/^you/(like|eat)/(apples|bananas)\\.txt$/');
    }
    
  }
  
}).export(module);