
var assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var testData = {
  MySQL: { // pkey constraint, need auto_increment
    insert: [
      {user: 'user1', pass: 'pass1'},
      {user: 'user2', pass: 'pass2'}]
  },
  MongoDB: {
    insert: [ // mongodb is more flexible when it comes to id's
      {id: 1, user: 'user1', pass: 'pass1'},
      {id: 2, user: 'user2', pass: 'pass2'}]
  }
}

function ModelBatch() {
  
  var data, model, multi;
  
  var instance = {
    
    insert: {

      'Model API: insert': {

        topic: function() {
          var promise = new EventEmitter();
          
          multi.insert(data.insert[0], {cacheInvalidate: ['get', 'getall']});
          multi.insert(data.insert[1]);

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

          // object + cache » store
          multi.get({user: 'user1'}, {cacheID: 'get', cacheTimeout: 3600});

          // object + cache » use
          multi.get({user: 'user1'}, {cacheID: 'get', cacheTimeout: 3600});

          // integer
          multi.get(1);

          // array
          multi.get([1,2]);

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Returns valid results + stores/uses cache': function(results) {
          var expected = [
            { user: 'user1', pass: 'pass1', id: 1 },
            { user: 'user1', pass: 'pass1', id: 1 },
            { user: 'user1', pass: 'pass1', id: 1 },
            [ { user: 'user1', pass: 'pass1', id: 1 },
              { user: 'user2', pass: 'pass2', id: 2 } ] ];
              
          assert.deepEqual(results, expected);
        }

      }

    },
    
    getAll: {

      'Model API: getAll': {

        topic: function() {
          var promise = new EventEmitter();

          // getall (no cache)
          multi.getAll();

          // getall + cache » store
          multi.getAll({cacheID: 'getall', cacheTimeout: 3600});
          
          // getall + cache » use
          multi.getAll({cacheID: 'getall', cacheTimeout: 3600});

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Returns valid results + stores/uses cache': function(results) {
          var expected = [ 
            [ { user: 'user1', pass: 'pass1', id: 1 },
              { user: 'user2', pass: 'pass2', id: 2 } ],
            [ { user: 'user1', pass: 'pass1', id: 1 },
              { user: 'user2', pass: 'pass2', id: 2 } ],
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

          // save + caching
          multi.save({id: 1, user: '__user1', pass: '__pass1'}, {cacheInvalidate: ['get', 'getall']});

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
          multi.delete(2, {cacheInvalidate: ['get', 'getall']});

          // array
          multi.delete([1, 2]);

          multi.exec(function(err, results) {
            promise.emit('success', err || results);
          });

          return promise;
        },

        'Properly deletes from database + invalidates caches': function(results) {
          assert.deepEqual(results, ['OK', 'OK']);
        }

      }

    },
    
    cache: {
      
      'Model API: cache (support)': {
        
        "All model object methods support cache operations": function() {
          var cacheCompliance = model.app.globals.cacheCompliance;
          var expected = [ 
            { inv: [ 'get', 'getall' ] },
            { sto: 'get' },
            { use: 'get' },
            { sto: 'getall' },
            { use: 'getall' },
            { inv: [ 'get', 'getall' ] },
            { inv: [ 'get', 'getall' ] } ];
          
          assert.deepEqual(cacheCompliance, expected);
        }
        
      }
      
    }

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