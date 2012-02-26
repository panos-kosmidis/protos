
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    colorize = corejs.util.colorize,
    ModelBatch = require('../fixtures/model-batch'),
    Multi = require('multi'),
    createClient = require('mysql').createClient,
    EventEmitter = require('events').EventEmitter;

var mysql, multi, model, storageMulti, modelBatch;

var config = app.config.database.mysql.nocache,
    client = createClient(config),
    mclient = new Multi(client);

var table = config.table;

// Test table
var createTable = util.format('\
CREATE TABLE IF NOT EXISTS %s (\n\
  id INTEGER AUTO_INCREMENT NOT NULL,\n\
  user VARCHAR(255),\n\
  pass VARCHAR(255),\n\
  PRIMARY KEY (id)\n\
)', table);

// Cache Compliance

var cacheCompliance = [];

// Cache Events
var c = '0;36';
app.on('mysql_cache_store', function(cacheID, cache) {
  cacheCompliance.push({sto: cacheID});
  // console.log('    ✓ %s', colorize('Stored cache: ' + cacheID, c));
});

app.on('mysql_cache_use', function(cacheID, cache) {
  cacheCompliance.push({use: cacheID});
  // console.log('    ✓ %s', colorize('Using cache: ' + cacheID, c));
});

app.on('mysql_cache_invalidate', function(invalidated) {
  cacheCompliance.push({inv: invalidated});
  // console.log('    ✓ %s', colorize('Invalidated cache: ' + invalidated.join(', '), c));
});

// Test Model
function TestModel() {

  this.driver = 'mysql:cache';

  this.properties = app.globals.commonModelProps;

}

util.inherits(TestModel, corejs.lib.model);

var modelBatch = new ModelBatch();
    
vows.describe('drivers/mysql.js').addBatch({
  
  'Integrity Checks': {
    
    topic: function() {
      var promise = new EventEmitter();
      app.getResource('drivers/mysql:nocache', function(driver) {
        mysql = driver;
        multi = mysql.multi();
        
        multi.on('pre_exec', app.backupFilters);
        multi.on('post_exec', app.restoreFilters);
        
        promise.emit('success');
      });
      return promise;
    },
    
    'Sets db': function() {
      assert.isNotNull(mysql.db);
    },

    'Sets config': function() {
      assert.strictEqual(mysql.config.host, app.config.database.mysql.nocache.host);
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
  
  'Cache API Compliance': {
    
    topic: function() {
      var promise = new EventEmitter(),
          multi = app.getResource('drivers/mysql:cache').multi();
      
      // Cache invalidate
      multi.__exec({
        sql: 'SHOW TABLES',
        cacheInvalidate: ['cache1', 'cache2', 'cache3']
      });
      
      // Cache invalidate
      multi.insertInto({
        table: table,
        values: {
          user: 'user1',
          pass: 'pass1'
        },
        cacheInvalidate: ['cache4', 'cache5', 'cache6']
      });
      
      // Cache store
      multi.query({
        sql: 'SHOW TABLES',
        cacheID: 'cache1'
      });
      
      // Cache use
      multi.query({
        sql: 'SHOW TABLES',
        cacheID: 'cache1'
      });
      
      // Cache store
      multi.queryWhere({
        table: table,
        condition: 'user=?',
        params: 1,
        cacheID: 'cache2'
      });
      
      // Cache use
      multi.queryWhere({
        table: table,
        condition: 'user=?',
        params: 1,
        cacheID: 'cache2'
      });
      
      // Cache store
      multi.queryAll({
        table: table,
        cacheID: 'cache3'
      });
      
      // Cache use
      multi.queryAll({
        table: table,
        cacheID: 'cache3'
      });
      
      // Cache store
      multi.queryById({
        table: table,
        id: 1,
        cacheID: 'cache4'
      });
      
      // Cache use
      multi.queryById({
        table: table,
        id: 1,
        cacheID: 'cache4'
      });
      
      // Cache store
      multi.countRows({
        table: table,
        cacheID: 'cache5'
      });
      
      // Cache use
      multi.countRows({
        table: table,
        cacheID: 'cache5'
      });
      
      // Cache store
      multi.idExists({
        table: table,
        id: 1,
        cacheID: 'cache6'
      });
      
      // Cache use
      multi.idExists({
        table: table,
        id: 1,
        cacheID: 'cache6'
      });
      
      // Cache invalidate
      multi.updateWhere({
        condition: 'id=?',
        params: 1,
        table: table,
        values: {
          user: 'user1',
          pass: 'pass1'
        },
        cacheInvalidate: ['cache1', 'cache2']
      });
      
      // Cache invalidate
      multi.updateById({
        table: table,
        id: 1,
        values: {
          user: 'USER1',
          pass: 'PASS1'
        },
        cacheInvalidate: ['cache3', 'cache4']
      });
      
      // Cache invalidate
      multi.deleteWhere({
        table: table,
        condition: 'id=?',
        params: 1,
        cacheInvalidate: 'cache5'
      });
      
      // Cache invalidate
      multi.deleteById({
        table: table,
        id: 1,
        cacheInvalidate: 'cache6'
      });
      
      multi.exec(function(err, results) {
        promise.emit('success');
      });
      
      return promise;
    },
    
    "All driver methods support cache operations": function() {
      var expected = [ 
        { inv: [ 'cache1', 'cache2', 'cache3' ] },
        { inv: [ 'cache4', 'cache5', 'cache6' ] },
        { sto: 'cache1' },
        { use: 'cache1' },
        { sto: 'cache2' },
        { use: 'cache2' },
        { sto: 'cache3' },
        { use: 'cache3' },
        { sto: 'cache4' },
        { use: 'cache4' },
        { sto: 'cache5' },
        { use: 'cache5' },
        { sto: 'cache6' },
        { use: 'cache6' },
        { inv: [ 'cache1', 'cache2' ] },
        { inv: [ 'cache3', 'cache4' ] },
        { inv: [ 'cache5' ] },
        { inv: [ 'cache6' ] } ];
        
      assert.deepEqual(cacheCompliance, expected);
      
      // Reset cache compliance
      while (cacheCompliance.pop() !== undefined);
      
      app.globals.cacheCompliance = cacheCompliance;
    }
    
  }
  
}).addBatch({
  
  'Model API Compliance': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Create model
      model = new TestModel();
      
      // Prepare model (initialize)
      model.prepare(app);
      
      // Override model context (not using className to detect context)
      model.context = config.table;
      
      // Set modelBatch's closure vars (setter)
      modelBatch.model = model;
      
      // Start with a clean table
      mclient.query('DROP TABLE ' + table);
      mclient.query(createTable);
      
      mclient.exec(function(err, results) {
        promise.emit('success', err || model);
      });
      
      return promise;
    },
    
    'Created testing model': function(model) {
      assert.instanceOf(model, TestModel);
    }
    
  }
  
})

// Model API Compliance tests

.addBatch(modelBatch.insert)
.addBatch(modelBatch.get)
.addBatch(modelBatch.getAll)
.addBatch(modelBatch.save)
.addBatch(modelBatch.delete)
.addBatch(modelBatch.cache)

.export(module);
