
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    colorize = corejs.util.colorize,
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    Cursor = mongodb.Cursor,
    Server = mongodb.Server,
    ObjectID = mongodb.ObjectID,
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

app.logging = true;

var mongodb, multi, model, storageMulti;

var config = app.config.database.mongodb;

//Local variables for testing
var userId1, userId2;

var oid = ObjectID('4de6abd5da558a49fc5eef29');

// Cache Events
var c = '0;36';
app.on('mongodb_cache_store', function(cacheID, cache) {
  console.log('    ✓ %s', colorize('Stored cache for ' + cacheID, c));
});

app.on('mongodb_cache_use', function(cacheID, cache) {
  console.log('    ✓ %s', colorize('Using cacheID' + cacheID, c));
});

app.on('mongodb_cache_invalidate', function(invalidated) {
  console.log('    ✓ %s', colorize('Invalidated ' + invalidated.join(', '), c));
});

// Test Model
function TestModel(app) {

  this.driver = 'mongodb';

  this.properties = {
    id    : {type: 'integer'},
    user  : {type: 'string', unique: true, required: true, validates: 'alnum_underscores'},
    pass  : {type: 'string', required: true, validates: 'alnum_underscores'},
  }

}

util.inherits(TestModel, corejs.lib.model);


vows.describe('lib/drivers/mongodb.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      app.getResource('drivers/mongodb', function(driver) {
        mongodb = driver;
        multi = mongodb.multi();
        promise.emit('success');
      });
      return promise;
    },
    
    'Sets db': function() {
      assert.instanceOf(mongodb.db, require('mongodb').Db);
    },

    'Sets config': function() {
      assert.strictEqual(mongodb.config.host, app.config.database.mongodb.host);
    },
    
    'Sets client': function() {
      assert.instanceOf(mongodb.client, require('mongodb').Db);
    }
    
  }
}).addBatch({
  
  'Preliminaries': {
    topic: function() {
      var promise = new EventEmitter();

      var db = new Db(config.database, new Server(config.host, config.port), {});
      
      db.open(function(err, client) {
        if (err) throw err;
        else {
          client.collection(config.collection, function(err, collection) {
            if (err) throw err;
            else {
              
              var multi = new Multi(collection);
              
              // Remove everything before starting the test
              multi.remove({});
              
              // Should get an empty array
              multi.find();
              
              multi.exec(function(err, results) {
                if (err) throw err;
                else {
                  var cursor = results.pop();
                  cursor.toArray(function(err, docs) {
                    if (err) throw err;
                    else {
                      results.push(docs);
                      promise.emit('success', results);
                    }
                  });
                }
              });
            }
          });
        }
      });

      return promise;
    },
    
    'Cleaned up collection': function(results) {
      assert.deepEqual(results, ['OK', []]);
    }
   }
  
}).addBatch({
  
  'MongoDB::insertInto': {
    
    topic: function() {
      var promise = new EventEmitter();

      // Insert user 1
      multi.insertInto({
        collection: config.collection,
        values: {
          _id: 1,
          user: 'user1',
          pass: 'pass1'
        }
      });
      
      // Insert user 2
      multi.insertInto({
        collection: config.collection,
        values: {
          _id: 2,
          user: 'user2',
          pass: 'pass2'
        }
      });
      
      // Insert user 3 (with oid)
      
      multi.insertInto({
        collection: config.collection,
        values: {
          _id: ObjectID('4de6abd5da558a49fc5eef29'),
          name: 'user3',
          pass: 'pass3'
        }
      })
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Inserts records into the database": function(results) {
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2];
      assert.deepEqual(r1, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.deepEqual(r2, [{_id: 2, user: 'user2', pass: 'pass2'}]);
      assert.equal(util.inspect(r3), util.inspect([{ _id: oid, name: 'user3', pass: 'pass3' }]));
    }
    
  }

}).addBatch({
  
  'MongoDB::queryWhere': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // condition + collection
      multi.queryWhere({
        collection: config.collection,
        condition: {user: 'user1'}
      });
      
      // condition + collection + fields
      multi.queryWhere({
        collection: config.collection,
        fields: {pass: 1},
        condition: {user: {$in: ['user1', 'user2']}}
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Returns valid results": function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.deepEqual(r1, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.deepEqual(r2, [{_id: 1, pass: 'pass1' }, { _id: 2, pass: 'pass2'}]);
    }
    
  }

}).addBatch({
  
  'MongoDB::queryAll': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Query all
      multi.queryAll({
        collection: config.collection
      });
      
      // Query all + fields
      multi.queryAll({
        collection: config.collection,
        fields: {pass: 1}
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Returns valid results": function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.deepEqual(r1[0], {_id: 1, user: 'user1', pass: 'pass1'});
      assert.deepEqual(r1[1], {_id: 2, user: 'user2', pass: 'pass2'});
      assert.equal(util.inspect(r1[2]), util.inspect({_id: oid, name: 'user3', pass: 'pass3'}));
      assert.deepEqual(r2[0], {_id: 1, pass: 'pass1'});
      assert.deepEqual(r2[1], {_id: 2, pass: 'pass2'});
      assert.equal(util.inspect(r2[2]), util.inspect({_id: oid, pass: 'pass3'}));
    }

  }
  
}).addBatch({
  
  'MongoDB::queryById': {
    
    topic: function() {
      var promise = new EventEmitter();

      // id (int) + collection
      multi.queryById({
        collection: config.collection,
        _id: 1
      });
      
      // id (string) + collection
      multi.queryById({
        collection: config.collection,
        _id: '4de6abd5da558a49fc5eef29'
      });
      
      // id (oid) + collection
      multi.queryById({
        collection: config.collection,
        _id: oid
      });
      
      // id (object) + collection
      multi.queryById({
        collection: config.collection,
        _id: {$lt: 2}
      });
      
      // id (array) + collection + fields
      multi.queryById({
        collection: config.collection,
        fields: {pass: 1},
        _id: [1, 2, '4de6abd5da558a49fc5eef29', oid, 99, '3de5abd4da447a40ab4dde18', ObjectID('3de5abd4da447a40ab4dde18')]
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Returns valid results": function(results) {
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2],
          r4 = results[3],
          r5 = results[4];
      assert.deepEqual(r1, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.equal(util.inspect(r2), util.inspect([{_id: oid, name: 'user3', pass: 'pass3'}]));
      assert.equal(util.inspect(r3), util.inspect([{_id: oid, name: 'user3', pass: 'pass3'}]));
      assert.deepEqual(r4, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.deepEqual(r5[0], {_id: 1, pass: 'pass1'});
      assert.deepEqual(r5[1], {_id: 2, pass: 'pass2'});
      assert.deepEqual(util.inspect(r5[2]), util.inspect({_id: oid, pass: 'pass3'}));
    }

  }
  
}).addBatch({
  
  'MongoDB::idExists': {
    
    topic: function() {
      process.exit();
      var promise = new EventEmitter();
      
      multi.idExists({
        collection: config.collection,
        _id: [1,2,99]
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "success": function(results) {
      var r = results[0];
      console.exit(r);
    }
    
  }
  
}).export(module);

/*
}).addBatch({
  
  'MongoDB::{method}': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "success": function(results) {
      var r = results[0];
      console.exit(r);
    }
    
  }
  
*/


























