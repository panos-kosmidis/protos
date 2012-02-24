
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    colorize = corejs.util.colorize,
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

app.logging = true;

var mongodb, multi, model, storageMulti;

var config = app.config.database.mongodb;

//Local variables for testing
var userId1, userId2;

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
              
              for (var i=1; i <= 6; i++) {
                multi.save({_id: i, user: 'user'+i, pass: 'pass'+i});
              }
              
              multi.exec(function(err, results) {
                promise.emit('success', err || results);
              });
            }
          });
        }
      });

      return promise;
    },
    
    'Inserted 6 test records': function(results) {
      assert.deepEqual(results, ['OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK']);
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
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Inserts records into the database": function(results) {
      var r1 = results[0],
          r2 = results[1];
      assert.deepEqual(r1, [{_id: 1, user: 'user1', pass: 'pass1'}]);
      assert.deepEqual(r2, [{_id: 2, user: 'user2', pass: 'pass2'}]);
    }
    
  }

}).addBatch({
  
  'MongoDB::queryWhere': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Query user 1
      multi.queryWhere({
        collection: config.collection,
        condition: {user: 'user1'}
      });
      
      // Query user1, user2
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
      assert.deepEqual(r1[2], {_id: 3, user: 'user3', pass: 'pass3'});
      assert.deepEqual(r1[3], {_id: 4, user: 'user4', pass: 'pass4'});
      assert.deepEqual(r1[4], {_id: 5, user: 'user5', pass: 'pass5'});
      assert.deepEqual(r1[5], {_id: 6, user: 'user6', pass: 'pass6'});
      assert.deepEqual(r2[0], {_id: 1, pass: 'pass1'});
      assert.deepEqual(r2[1], {_id: 2, pass: 'pass2'});
      assert.deepEqual(r2[2], {_id: 3, pass: 'pass3'});
      assert.deepEqual(r2[3], {_id: 4, pass: 'pass4'});
      assert.deepEqual(r2[4], {_id: 5, pass: 'pass5'});
      assert.deepEqual(r2[5], {_id: 6, pass: 'pass6'});
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


























