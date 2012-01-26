
var _ = require('underscore'),
    app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    colorize = framework.util.colorize,
    createClient = require('mysql').createClient;
    EventEmitter = require('events').EventEmitter;

app.logging = true;

var mysql, multi, model, storageMulti;

var config = app.config.database.mysql,
    client = createClient(config),
    mclient = app.createMulti(client);

var table = app.config.database.mysql.table;

// Test table
var createTable = util.format('\
CREATE TABLE IF NOT EXISTS %s (\n\
  id INTEGER AUTO_INCREMENT NOT NULL,\n\
  user VARCHAR(255),\n\
  pass VARCHAR(255),\n\
  PRIMARY KEY (id)\n\
)', table);

// Cache Events
app.on('mysql_cache_store', function(cacheID, cache) {
  console.log('    ✓ %s', colorize('Stored cache for ' + cacheID, '0;33'));
});

app.on('mysql_cache_use', function(cacheID, cache) {
  console.log('    ✓ %s', colorize('Using cacheID' + cacheID, '0;33'));
});

app.on('mysql_cache_invalidate', function(invalidated) {
  console.log('    ✓ %s', colorize('Invalidated ' + invalidated.join(', '), '0;33'));
});

// Test Model
function TestModel(app) {

  this.driver = 'mysql';

  this.properties = {
    id    : {type: 'integer'},
    user  : {type: 'string', unique: true, required: true, validates: 'alnum_underscores'},
    pass  : {type: 'string', required: true, validates: 'alnum_underscores'},
  }

}

util.inherits(TestModel, framework.lib.model);

vows.describe('lib/drivers/mysql.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = new EventEmitter();
      app.getResource('drivers/mysql', function(driver) {
        mysql = driver;
        multi = mysql.multi();
        promise.emit('success');
      });
      return promise;
    },
    
    'Sets db': function() {
      assert.isNotNull(mysql.db);
    },

    'Sets config': function() {
      assert.strictEqual(mysql.config.host, app.config.database.mysql.host);
    },
    
    'Sets client': function() {
      assert.instanceOf(mysql.client, client.constructor);
    }

  }
  
}).addBatch({
  
  'Preliminaries': {
    
    topic: function() {
      var promise = new EventEmitter();
      mclient.query('DROP TABLE IF EXISTS ' + table);
      mclient.query(createTable);
      mclient.exec(function(err, results) {
        promise.emit('success', err);
      });
      return promise;
    },
    
    'Created temporary table': function(err) {
      assert.isNull(err);
    }
    
  }
  
}).addBatch({
  
  'MySQL::exec': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // sql
      multi.__exec({sql: util.format('SELECT COUNT(id) AS count FROM %s', table)});
      
      // sql + params
      multi.__exec({
        sql: util.format('INSERT INTO %s VALUES (?,?,?)', table),
        params: [null, 'username', 'password']
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      return promise;
    },
    
    'Performs simple queries': function(results) {
      assert.deepEqual(results[0], [{count: 0}]);
    },
    
    'Performs queries with parameters': function(results) {
      assert.strictEqual(results[1].affectedRows, 1);
    }
    
  }
  
}).addBatch({
  
  'MySQL::insertInto': {
    
    topic: function() {
      var promise = new EventEmitter();
      mysql.insertInto({
        table: table,
        values: {
          user: 'user1',
          pass: 'pass1'
        }
      }, function(err, results) {
        promise.emit('success', err || results);
      });
      return promise;
    },
    
    'Inserts records into the database': function(results) {
      assert.strictEqual(results.insertId, 2);
    }
    
  }
  
}).addBatch({
  
  'MySQL::query': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // sql
      multi.query({sql: util.format('SELECT * FROM %s', table)});
      
      // sql + params
      multi.query({
        sql: util.format('SELECT * FROM %s WHERE id=?', table),
        params: [2]
      });
      
      // sql + params + appendSql
      multi.query({
        sql: util.format('SELECT id,user FROM %s WHERE id=? OR id=1', table),
        params: [2],
        appendSql: 'ORDER BY id DESC'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Returns valid results': function(results) {
      var q1 = results[0][0],
          q2 = results[1][0],
          q3 = results[2][0];
      assert.strictEqual(q1.length, 2);
      assert.strictEqual(q1[0].id, 1);
      assert.strictEqual(q1[1].id, 2);
      assert.deepEqual(Object.keys(q1[0]), ['id', 'user', 'pass']);
      assert.strictEqual(q2.length, 1);
      assert.strictEqual(q2[0].id, 2);
      assert.deepEqual(Object.keys(q2[0]), ['id', 'user', 'pass']);
      assert.strictEqual(q3.length, 2);
      assert.strictEqual(q3[0].id, 2);
      assert.strictEqual(q3[1].id, 1);
      assert.deepEqual(Object.keys(q3[0]), ['id', 'user']);
    }
    
  }
  
}).addBatch({
  
  'MySQL::queryWhere': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // cond + params + table
      multi.queryWhere({
        condition: 'id=?',
        params: [1],
        table: table
      });
      
      // cond + table
      multi.queryWhere({
        condition: 'id=1',
        table: table
      });
      
      // cond + table + columns
      multi.queryWhere({
        condition: 'id=1',
        table: table,
        columns: 'user'
      });
      
      // cond + table + columns + appendSql
      multi.queryWhere({
        condition: 'id in (1,2)',
        table: table,
        columns: 'user',
        appendSql: 'ORDER BY id ASC'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Returns valid results': function(results) {
      var q1 = results[0][0],
          q2 = results[1][0],
          q3 = results[2][0],
          q4 = results[3][0];
      assert.strictEqual(q1.length, 1);
      assert.strictEqual(q1[0].id, 1);
      assert.deepEqual(Object.keys(q1[0]), ['id', 'user', 'pass']);
      assert.strictEqual(q2.length, 1);
      assert.strictEqual(q2[0].id, 1);
      assert.deepEqual(Object.keys(q2[0]), ['id', 'user', 'pass']);
      assert.strictEqual(q3.length, 1);
      assert.strictEqual(q3[0].user, 'username');
      assert.deepEqual(Object.keys(q3[0]), ['user']);
      assert.strictEqual(q4.length, 2);
      assert.deepEqual(q4, [{user: 'username'}, {user: 'user1'}]);
    }
    
  }
  
}).addBatch({
  
  'MySQL::queryAll': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // table
      multi.queryAll({
        table: table
      });
      
      // columns + table
      multi.queryAll({
        columns: 'user',
        table: table
      });
      
      // columns + table + appendSql
      multi.queryAll({
        columns: 'user, pass',
        table: table,
        appendSql: 'ORDER BY id DESC'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Returns valid results': function(results) {
      var q1 = results[0][0],
          q2 = results[1][0],
          q3 = results[2][0];
      assert.strictEqual(q1.length, 2);
      assert.strictEqual(q1[0].id, 1);
      assert.strictEqual(q1[1].id, 2);
      assert.deepEqual(Object.keys(q1[0]), ['id', 'user', 'pass']);
      assert.strictEqual(q2.length, 2);
      assert.strictEqual(q2[0].user, 'username');
      assert.strictEqual(q2[1].user, 'user1');
      assert.deepEqual(Object.keys(q2[0]), ['user']);
      assert.strictEqual(q3.length, 2);
      assert.strictEqual(q3[0].user, 'user1');
      assert.strictEqual(q3[1].user, 'username');
      assert.deepEqual(Object.keys(q3[0]), ['user', 'pass']);
    }
    
  }
  
}).addBatch({
  
  'MySQL::queryById': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // id (array) + table
      multi.queryById({
        id: [1,2],
        table: table
      });
      
      // id + table
      multi.queryById({
        id: 1,
        table: table
      });
      
      // id + table + columns
      multi.queryById({
        id: 1,
        table: table,
        columns: 'id'
      });

      // id (array) + table + columns + appendSql
      multi.queryById({
        id: [1,2],
        table: table,
        columns: 'id, user',
        appendSql: 'ORDER BY user ASC'
      });      
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Returns valid results': function(results) {
      var q1 = results[0][0],
          q2 = results[1][0],
          q3 = results[2][0],
          q4 = results[3][0];
      assert.strictEqual(q1.length, 2);
      assert.strictEqual(q1[0].id, 1);
      assert.strictEqual(q1[1].id, 2);
      assert.strictEqual(q2.length, 1);
      assert.strictEqual(q2[0].id, 1);
      assert.strictEqual(q3.length, 1);
      assert.deepEqual(Object.keys(q3[0]), ['id']);
      assert.strictEqual(q3[0].id, 1);
      assert.strictEqual(q4.length, 2);
      assert.strictEqual(q4[0].id, 2);
      assert.strictEqual(q4[1].id, 1);
      assert.deepEqual(Object.keys(q4[0]), ['id', 'user']);
    }
    
  }
  
}).addBatch({
  
  'MySQL::countRows': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      mysql.countRows({table: table}, function(err, count) {
        promise.emit('success', count);
      });
      
      return promise;
    },
    
    'Returns correct count': function(count) {
      assert.strictEqual(count, 2);
    }
    
  }
  
}).addBatch({
  
  'MySQL::idExists': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // id (array) + table
      multi.idExists({
        id: [1,2,3],
        table: table
      });
      
      // id + table + columns
      multi.idExists({
        id: 1,
        table: table,
        columns: 'id'
      });
      
      // id + table + appendSql
      multi.idExists({
        id: [1,2],
        table: table,
        appendSql: 'ORDER BY id DESC'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Returns valid results': function(results) {
      var q1 = results[0],
          q1Keys = Object.keys(q1),
          q2 = results[1],
          q3 = results[2],
          q3Keys = Object.keys(q3);
      assert.strictEqual(q1Keys.length, 3);
      assert.strictEqual(q1[1].id, 1);
      assert.strictEqual(q1[2].id, 2);
      assert.isNull(q1[3]);
      assert.deepEqual(q1Keys, ['1', '2', '3']);
      assert.deepEqual(q2, {id: 1});
      assert.strictEqual(q3Keys.length, 2);
      assert.strictEqual(q3[1].id, 1);
      assert.strictEqual(q3[2].id, 2);
      assert.deepEqual(q3Keys, ['1', '2']);
    }
    
  }
  
}).addBatch({
  
  'MySQL::recordExists': {
    
    topic: function() {
      var promise = new EventEmitter();
     
      // condition + table
      multi.recordExists({
        condition: 'id=99',
        table: table
      });
      
      // condition + params + table
      multi.recordExists({
        condition: 'id=?',
        params: [1],
        table: table
      });
      
      // condition + params + table + columns
      multi.recordExists({
        condition: 'id=?',
        params: [2],
        table: table,
        columns: 'id, pass'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
     
      return promise;
    },
    
    'Returns valid results': function(results) {
      var q1 = results[0],
          q2 = results[1],
          q3 = results[2];
      assert.strictEqual(q1.length, 2);
      assert.isFalse(q1[0]);
      assert.strictEqual(q1[1].length, 0);
      assert.strictEqual(q2.length, 2);
      assert.isTrue(q2[0]);
      assert.deepEqual(q2[1], [{id: 1, user: 'username', pass: 'password' }]);
      assert.strictEqual(q3.length, 2);
      assert.isTrue(q3[0]);
      assert.deepEqual(q3[1], [{id: 2, pass: 'pass1'}]);
    }
    
  }
  
}).addBatch({
  
  'MySQL::updateWhere': {
    
    topic: function() {
      var promise = new EventEmitter();

      // condition + table + values
      multi.updateWhere({
        condition: 'id=1',
        table: table,
        values: {user: '__user', pass: '__pass'}
      });

      // condition + params + table + values
      multi.updateWhere({
        condition: 'id=?',
        params: [1],
        table: table,
        values: {user: '__user1', pass: '__pass1'}
      });

      // condition + params + table + values + appendSql
      multi.updateWhere({
        condition: 'id=? OR id=?',
        params: [1, 2],
        table: table,
        values: {user: 'user', pass: 'pass'},
        appendSql: 'LIMIT 1'
      });

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    'Updates values correctly': function(results) {
      var q1 = results[0],
          q2 = results[1],
          q3 = results[2];
      assert.strictEqual(q1.affectedRows, 1);
      assert.strictEqual(q2.affectedRows, 1);
      assert.strictEqual(q3.affectedRows, 1);
    }
    
  }

}).addBatch({
  
  'MySQL::updateById': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // id + table + values
      multi.updateById({
        id: 1,
        table: table,
        values: {pass: 'p1234'}
      });
      
      // id (array) + table + values + appendSql
      multi.updateById({
        id: [1,2],
        table: table,
        values: {pass: 'p9999'},
        appendSql: 'LIMIT 1'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Updates values correctly': function(results) {
      var q1 = results[0],
          q2 = results[1];
      assert.strictEqual(q1.affectedRows, 1);
      assert.strictEqual(q2.affectedRows, 1);
    }
    
  }
  
}).addBatch({
  
  'MySQL::deleteWhere': {

    topic: function() {
      var promise = new EventEmitter();

      // Insert 2 more entries
      multi.insertInto({table: table, values: {user: 'user3', pass: 'pass3'}});
      multi.insertInto({table: table, values: {user: 'user4', pass: 'pass4'}});

      // condition + table
      multi.deleteWhere({
        condition: 'id=4',
        table: table
      });
      
      // condition + params + table
      multi.deleteWhere({
        condition: 'id=?',
        params: [3],
        table: table
      });
      
      // condition + params + table + appendSql
      multi.deleteWhere({
        condition: 'id=? OR id=?',
        params: [1, 2],
        table: table,
        appendSql: 'LIMIT 1'
      });

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Properly deletes values': function(results) {
      // Note: The first two insert the new entries
      var q1 = results[2],
          q2 = results[3],
          q3 = results[4];
      assert.strictEqual(q1.affectedRows, 1);
      assert.strictEqual(q2.affectedRows, 1);
      assert.strictEqual(q3.affectedRows, 1);
    }
    
  }
  
}).addBatch({
  
  'MySQL::deleteById': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Insert 2 more entries
      multi.insertInto({table: table, values: {user: 'user5', pass: 'pass5'}});
      multi.insertInto({table: table, values: {user: 'user6', pass: 'pass6'}});
      
      // id + table
      multi.deleteById({
        id: 2, // Present from previous batches
        table: table
      });
      
      // id (array) + table + appendSql
      multi.deleteById({
        id: [5,6,99],
        table: table,
        appendSql: 'LIMIT 2'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    'Properly deletes values': function(results) {
      // Note: The first two insert the new entries
      var q1 = results[2],
          q2 = results[3];
      assert.strictEqual(q1.affectedRows, 1);
      assert.strictEqual(q2.affectedRows, 2);
    }
    
  }
  
}).addBatch({
  
  'Model API Compliance': {
    
    topic: function() {
      var promise = new EventEmitter();
      // Reset table ID's, disregard previous operations
      mclient.query('DROP TABLE IF EXISTS ' + table);
      mclient.query(createTable);
      mclient.exec(function(err, results) {
        model = new TestModel();
        model.prepare(app);
        model.context = table; // Override context
        multi = model.multi(); // Override multi
        mysql.storage = app.getResource('storages/redis'); // Manually set cache storage
        mysql.setCacheFunc(mysql.client, 'query'); // Manually set cache function
        storageMulti = mysql.storage.multi();
        promise.emit('success', err || model);
      });
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
      assert.deepEqual(results, [1, 2]);
    }
    
  }
  
}).addBatch({
  
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
      var expected1 = { id: 1, user: 'user1', pass: 'pass1' },
          expected2 = { id: 2, user: 'user2', pass: 'pass2' };
      assert.deepEqual(q1.__currentState, expected1);
      assert.deepEqual(q2.__currentState, expected1);
      assert.strictEqual(q3.length, 2);
      assert.deepEqual(q3[0].__currentState, expected1);
      assert.deepEqual(q3[1].__currentState, expected2);
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
      var expected1 = { id: 1, user: 'user1', pass: 'pass1' },
          expected2 = { id: 2, user: 'user2', pass: 'pass2' };
      assert.deepEqual(q1, [expected1, expected2]);
      assert.deepEqual(q2, [expected1, expected2]);
    }
    
  }
  
}).addBatch({
  
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
  
}).addBatch({
  
  'Model API: delete': {
  
    topic: function() {
      var promise = new EventEmitter();

      // integer + invalidate
      multi.delete(2, {cacheInvalidate: ['api_get', 'api_getall']});

      // array
      multi.delete([1,2]);

      multi.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    'Properly deletes from database + invalidates caches': function(results) {
      assert.deepEqual(results, ['OK', ['OK', 'OK'] ]);
    }
    
  }
  
}).addBatch({
  
  'Cleanup': {
    
    topic: function() {
      var promise = new EventEmitter();
      mysql.exec({sql: 'DROP TABLE IF EXISTS ' + table}, function(err) {
        promise.emit('success', err);
      });
      return promise;
    },
    
    'Removed test data': function(err) {
      assert.isNull(err);
    }
    
  }
  
}).export(module);
