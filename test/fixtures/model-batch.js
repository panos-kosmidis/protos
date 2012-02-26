
var assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

function ModelBatch() {
  
  var model, multi;
  
  var instance = {
    
    insert: {

      'Model API: insert': {

        topic: function() {
          var promise = new EventEmitter();
          
          multi.insert({user: 'user1', pass: 'pass1'}, {cacheInvalidate: ['api_get', 'api_getall']});
          multi.insert({user: 'user2', pass: 'pass2'});

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;

        },

        'Inserts new models + invalidates caches': function(results) {
          assert.deepEqual(results, [1, 2]);
        }

      }

    },
    
    get: {

      'Model API: get': {

        topic: function() {
          var promise = new EventEmitter();

          // object + caching
          multi.get({user: 'user1'}, {cacheID: 'api_get', cacheTimeout: 3600});

          // integer
          multi.get(1);

          // array
          multi.get([1,2]);

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Returns valid results + caches data': function(results) {
          var q1 = results[0],
              q2 = results[1],
              q3 = results[2];
          var expected1 = {id: 1, user: 'user1', pass: 'pass1' },
              expected2 = {id: 2, user: 'user2', pass: 'pass2' };
          assert.deepEqual(q1.__currentState, expected1);
          assert.deepEqual(q2.__currentState, expected1);
          assert.strictEqual(q3.length, 2);
          assert.deepEqual(q3[0].__currentState, expected1);
          assert.deepEqual(q3[1].__currentState, expected2);
        }

      }

    },
    
    getAll: {

      'Model API: getAll': {

        topic: function() {
          var promise = new EventEmitter();

          // getall
          multi.getAll();

          // getall + invalidate
          multi.getAll({cacheID: 'api_getall', cacheTimeout: 3600});

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Returns valid results + caches data': function(results) {
          var q1 = results[0],
              q2 = results[1];
          var expected1 = {id: 1, user: 'user1', pass: 'pass1' },
              expected2 = {id: 2, user: 'user2', pass: 'pass2' };
          assert.deepEqual(q1, [expected1, expected2]);
          assert.deepEqual(q2, [expected1, expected2]);
        }

      }

    },
    
    save: {

      'Model API: save': {

        topic: function() {
          var promise = new EventEmitter();

          // save + caching
          multi.save({id: 1, user: '__user1', pass: '__pass1'}, {cacheInvalidate: ['api_get', 'api_getall']});

          // save
          multi.save({id: 1, user: '__user1__', pass: '__pass1__'});

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Updates model data + invalidates caches': function(results) {
          assert.deepEqual(results, ['OK', 'OK']);
        }

      }

    },
    
    delete: {

      'Model API: delete': {

        topic: function() {
          var promise = new EventEmitter();

          // integer + invalidate
          multi.delete(2, {cacheInvalidate: ['api_get', 'api_getall']});

          // array
          multi.delete([1, 2]);

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Properly deletes from database + invalidates caches': function(results) {
          assert.deepEqual(results, ['OK', ['OK', 'OK'] ]);
        }

      }

    }

  }
  
  // Defining a `model` setter, to prevent conflicts with vows
  instance.__defineSetter__('model', function(m) {
    model = m;
    multi = model.multi();
  });
  
  return instance;
}

module.exports = ModelBatch;