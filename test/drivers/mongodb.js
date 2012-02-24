
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
                promise.emit('success', err || results)
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
  
}).export(module);

return;


vows.addBatch({

  'mongodb::insertInto': {
    
    topic: function() {
      var promise = new EventEmitter();
      mongodb.insertInto({
        collection: 'users',
        values: {
          user: 'user4',
          pass: 'pass4'
        }
      }, function(err, results) {
        promise.emit('success', err || results);
      });
      return promise;
    },
    
    'Inserts records into the database': function(results) {
      assert.strictEqual(results[0].user, 'user4');
      assert.strictEqual(results[0].pass, 'pass4');
    }
  }
  
}).addBatch({

  'mongodb::updateById': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.updateById({
        _id: 1,
        collection: 'users',
        values: {pass: 'p111'}
      });
      
      multi.updateById({
        _id: [2, 3],
        collection: 'users',
        values: {pass: 'p232323'}
      });

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Updates values correctly': function(results) {
      assert.strictEqual(results[0], 1);
      assert.strictEqual(results[1], 2);
    }
  }
}).addBatch({

  'mongodb::updateWhere': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.updateWhere({
        collection: 'users',
        condition: {user: 'user2'},
        values: {pass: 'p22222'}
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Updates values correctly': function(results) {
      assert.strictEqual(results[0], 1);
    }
  }
}).addBatch({

  'mongodb::deleteById': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.deleteById({
        _id: 1,
        collection: 'users'
      });
      
      multi.deleteById({
        _id: [2, 3],
        collection: 'users'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Deleted values correctly': function(results) {
      assert.strictEqual(results[0], 1);
      assert.strictEqual(results[1], 2);
    }
  }
}).addBatch({

  'mongodb::deleteWhere': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.deleteWhere({
        collection: 'users',
        condition: {user: 'user4'}
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Deleted values correctly': function(results) {
      assert.strictEqual(results[0], 1);
    }
  }
}).addBatch({

  'mongodb::queryById': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.queryById({
        _id: 5,
        collection: 'users',
        fields: {'user': 1}
      });

      multi.queryById({
        _id: [6, 7],
        collection: 'users',
        fields: {'user': 1}
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Queried values correctly': function(results) {
      var result1 = results[0],
          result2 = results[1];
      assert.strictEqual(result1[0].user, 'user5');
      assert.strictEqual(result2[0].user, 'user6');
      assert.strictEqual(result2[1].user, 'user7');
    }
  }
}).addBatch({

  'mongodb::queryWhere': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.queryWhere({
        collection: 'users',
        condition: {'user': 'user5'},
        fields: {'user': 1, 'pass': 1}
      });

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Queried values correctly': function(results) {
      assert.strictEqual(results[0][0].user, 'user5');
      assert.strictEqual(results[0][0].pass, 'pass5');
    }
  }
}).addBatch({

  'mongodb::queryAll': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.queryAll({
        collection: 'users',
        fields: {'user': 1, 'pass': 1}
      });

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Queried values correctly': function(results) {
      assert.strictEqual(results[0].length, 3);
      assert.strictEqual(results[0][0].user, 'user5');
      assert.strictEqual(results[0][0].pass, 'pass5');
    }
  }
}).addBatch({

  'mongodb::recordExists': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.recordExists({
        collection: 'users',
        condition: {'user': 'user5'},
        fields: {'user': 1, 'pass': 1}
      });

      multi.recordExists({
        collection: 'users',
        condition: {'user': 'userxxxx5'},
        fields: {'user': 1, 'pass': 1}
      });
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Verify record exists or not': function(results) {
      // First query with user name 'user5' which exists
      assert.strictEqual(results[0][0], true);
      assert.strictEqual(results[0][1][0].user, 'user5');
      assert.strictEqual(results[0][1][0].pass, 'pass5');

      // Second query with user name 'userxxxxx5' which does not exists
      assert.strictEqual(results[1][0], false);
    }
  }
}).addBatch({

  'mongodb::idExists': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.idExists({
        collection: 'users',
        _id: 5,
        fields: {'user': 1, 'pass': 1}
      });

      multi.idExists({
        collection: 'users',
        _id: 999,
        fields: {'user': 1, 'pass': 1}
      });

      multi.idExists({
        collection: 'users',
        _id: [6, 7],
        fields: {'user': 1, 'pass': 1}
      });

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Verify id exists or not': function(results) {
      // First query with _id 5 which exists
      assert.strictEqual(results[0][0], true);
      assert.strictEqual(results[0][1][0].user, 'user5');
      assert.strictEqual(results[0][1][0].pass, 'pass5');

      // Second query with _id 999 which does not exists
      assert.strictEqual(results[1][0], false);

      // Third query with _id 6 and 7  which exists
      assert.strictEqual(results[2][0], true);
      assert.strictEqual(results[2][1][0].user, 'user6');
      assert.strictEqual(results[2][1][0].pass, 'pass6');
      assert.strictEqual(results[2][1][1].user, 'user7');
      assert.strictEqual(results[2][1][1].pass, 'pass7');
    }
  }
}).addBatch({

  'mongodb::countRows': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.countRows({
        collection: 'users'
      });

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Verify count rows is correct': function(results) {
      assert.strictEqual(results[0], 3);
    }
  }
}).addBatch({
  'mongodb::removeRecords': {
    
    topic: function() {
      var promise = new EventEmitter();

      multi.removeRecords({
        collection: 'users'
      });

      multi.countRows({
        collection: 'users'
      });

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Removed all rows correctly': function(results) {
      assert.strictEqual(results[0], 3);

      // After deleting number of rows should be 0
      assert.strictEqual(results[1], 0);
    }
  }
}).addBatch({
  'Model API Compliance': {
    
    topic: function() {
      var promise = new EventEmitter();
      model = new TestModel();
      model.prepare(app);
      multi = model.multi(); // Override multi
      mongodb.storage = app.getResource('storages/redis'); // Manually set cache storage
      mongodb.setCacheFunc(mongodb.client, 'find'); // Manually set cache function
      promise.emit('success', model);
      return promise;
    },
    
    'Created testing model': function(model) {
      assert.instanceOf(model, TestModel);
    }
    
  }
  
}).addBatch({
  
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
      // Validate the mongodb id using regular expression?
      var r1 = results[0],
          r2 = results[1],
          idRegex = /^[a-f0-9]{24}$/;

      assert.isTrue(idRegex.test(r1));
      assert.isTrue(idRegex.test(r2));

      userId1 = r1;
      userId2 = r2;
    }
    
  }
  
}).addBatch({
  
  'Model API: get': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // object + caching
      //multi.get({user: 'user1'}, {cacheID: 'api_get', cacheTimeout: 3600});
      
      // string 
      multi.get(userId1.toString());
      
      // array
      multi.get([userId1.toString(),userId2.toString()]);
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Returns valid results + caches data': function(results) {
      var q1 = results[0],
          q2 = results[1][0],
          q3 = results[1][1];
      var expected1 = { user: 'user1', pass: 'pass1' },
          expected2 = { user: 'user2', pass: 'pass2' };
      assert.strictEqual(q1.user, expected1.user);
      assert.strictEqual(q1.pass, expected1.pass);
      assert.strictEqual(q2.user, expected1.user);
      assert.strictEqual(q2.pass, expected1.pass);
      assert.strictEqual(q3.user, expected2.user);
    }
    
  }
  
}).addBatch({
  
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
      var expected1 = { user: 'user1', pass: 'pass1' },
          expected2 = { user: 'user2', pass: 'pass2' };
      assert.strictEqual(q1[0].user, expected1.user);
      assert.strictEqual(q1[0].pass, expected1.pass);
      assert.strictEqual(q1[1].user, expected2.user);
      assert.strictEqual(q1[1].pass, expected2.pass);
      assert.strictEqual(q2[0].user, expected1.user);
      assert.strictEqual(q2[0].pass, expected1.pass);
      assert.strictEqual(q2[1].user, expected2.user);
      assert.strictEqual(q2[1].pass, expected2.pass);
    }
    
  }
  
}).addBatch({
  
  'Model API: save': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // save + caching
      multi.save({_id: userId1.toString(), user: '__user1', pass: '__pass1'}, {cacheInvalidate: ['api_get', 'api_getall']});
      
      // save
      multi.save({_id: userId1.toString(), user: '__user1__', pass: '__pass1__'});
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Updates model data + invalidates caches': function(results) {
      assert.deepEqual(results, ['OK', 'OK']);
    }
    
  }
  
}).addBatch({
  
  'Model API: delete': {
  
    topic: function() {
      var promise = new EventEmitter();

      // integer + invalidate
      multi.delete(userId1.toString(), {cacheInvalidate: ['api_get', 'api_getall']});

      // array
      multi.delete([userId1.toString(), userId2.toString()]);

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    'Properly deletes from database + invalidates caches': function(results) {
      assert.deepEqual(results, ['OK', ['OK', 'OK'] ]);
    }
    
  }
}).export(module);