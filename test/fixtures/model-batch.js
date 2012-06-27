
var assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var testData = {
  MySQL: { // pkey constraint, need auto_increment
    insert: [
      {user: 'user1', pass: 'pass1'},
      {user: 'user2', pass: 'pass2'},
      {user: '!@#$%', pass: 'pass3'}] // invalid
  },
  MongoDB: {
    insert: [ // mongodb is more flexible when it comes to id's
      {id: 1, user: 'user1', pass: 'pass1'},
      {id: 2, user: 'user2', pass: 'pass2'},
      {id: 3, user: '!@#$%', pass: 'pass3'}] // invalid
  }
}

function ModelBatch() {
  
  var data, model, multi;
  
  var instance = {
    
    insert: {

      'Model API: insert': {

        topic: function() {
          var promise = new EventEmitter();
          
          // Invalidate testmodel:user_cache
          
          // ################### QUERY CACHING TESTS [MODELS] #####################
          
          // Insert first item
          multi.queryCached({
           cacheInvalidate: 'user_cache'
          }, 'insert', data.insert[0]);
          
          // ################### QUERY CACHING TESTS [DRIVER] #####################
          
          // Insert second item
          multi.insert(data.insert[1]);
          
          // Attempt to insert data that does not validate => err is returned
          multi.insert(data.insert[2])

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;

        },

        'Inserts new models': function(results) {
          assert.isArray(results);
          assert.equal(results.length, 3);
          assert.isNull(results[0]);
          assert.isNull(results[1]);
          assert.equal(results[2].toString(), "Error: TestModel: Unable to validate 'user': !@#$%");
        }

      }

    },
    
    get: {

      'Model API: get': {

        topic: function() {
          var promise = new EventEmitter();

          // object + model cache store
          multi.queryCached({
            cacheID: 'user_cache'
          }, 'get', {
            user: 'user1'
          });
          
          // integer + model cache store w/ timeout
          multi.queryCached({
            cacheID: 'another_cache',
            cacheTimeout: 3600
          }, 'get', 1);
          
          // array
          multi.get([1,2]);

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Returns valid results': function(results) {
          var expected = [
            [{ user: 'user1', pass: 'pass1', id: 1 }],
            [{ user: 'user1', pass: 'pass1', id: 1 }],
            [ [{ user: 'user1', pass: 'pass1', id: 1 }],
              [{ user: 'user2', pass: 'pass2', id: 2 }] ] ];
          assert.deepEqual(results, expected);
        }

      }

    },
    
    getAll: {

      'Model API: getAll': {

        topic: function() {
          var promise = new EventEmitter();

          // getall
          multi.getAll();

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Returns valid results': function(results) {
          var expected = [ 
            [ { user: 'user1', pass: 'pass1', id: 1 },
              { user: 'user2', pass: 'pass2', id: 2 } ] ];
          
          assert.deepEqual(results, expected);
        }

      }

    },
    
    save: {

      'Model API: save': {

        topic: function() {
          var promise = new EventEmitter();

          // save => success
          multi.save({id: 1, user: '__user1', pass: '__pass1'});

          // save + update => success
          multi.save({id: 1, user: '__user1__', pass: '__pass1__'});

          // partial save => success
          multi.save({id: 1, user: '__user1__updated'});

          // save with data that does not validate => err is returned
          multi.save({id: 1, user: '!#$%^&*'});

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Updates model data': function(err, results) {
          assert.instanceOf(results, Array);
          assert.equal(results.length, 4);
          assert.isNull(results[0]);
          assert.isNull(results[1]);
          assert.isNull(results[2]);
          assert.equal(results[3].toString(), "Error: TestModel: Unable to validate 'user': !#$%^&*");
        }

      }

    },
    
    delete: {

      'Model API: delete': {

        topic: function() {
          var promise = new EventEmitter();

          // integer
          multi.delete(2);

          // array
          multi.delete([1, 2]);

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Properly deletes from database': function(results) {
          assert.deepEqual(results, ['OK', 'OK']);
        }

      }

    },
    
  }
  
  // Defining a `model` setter, to prevent conflicts with vows
  instance.__defineSetter__('model', function(m) {
    model = m;
    multi = model.multi();
    data = testData[model.driver.className];
  });
  
  // Attach to current batch
  instance.forEach = function(callback) {
    var keys = Object.keys(this);
    for (var test, i=0; i < keys.length; i++) {
      var key = keys[i],
          item = this[key];
      if (typeof item == 'object') callback(item);
    }
  }
  
  return instance;
}

module.exports = ModelBatch;