
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    util = require('util'),
    assert = require('assert'),
    createClient = require('mysql').createClient;
    EventEmitter = require('events').EventEmitter;

var mysql, multi;

var config = app.config.database.mysql,
    client = createClient(config);

var table = app.config.database.mysql.table;

// Test table
var createTable = util.format('\
CREATE TABLE IF NOT EXISTS %s (\n\
  id INTEGER AUTO_INCREMENT NOT NULL,\n\
  user VARCHAR(255),\n\
  pass VARCHAR(255),\n\
  PRIMARY KEY (id)\n\
)', table);

/*
Driver API:
===========

1) Storage Operations
  * 'exec',
  * 'insertInto',

2) Retrieval Operations
  'query',
  'queryWhere',
  'queryAll',
  'queryById',
  'countRows',
  'idExists',
  'recordExists'

3) Delete Operations
  'deleteById',
  'deleteWhere'

4) Rename Operations
  N/A

5) Update Operations
  'updateById',
  'updateWhere'


Model API:
==========

[ 'insert', 'get', 'getAll', 'save', 'delete' ]

1) Storage Operations
  'insert'
  
2) Retrieval Operations
  'get',
  'getAll'
  
3) Delete Operations
  'delete'
  
4) Rename Operations
  N/A
  
5) Update Operations
  'save'

*/

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
      var mclient = app.createMulti(client),
          promise = new EventEmitter();
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
      multi.__exec({sql: util.format('SELECT COUNT(id) AS count FROM %s', table)});
      multi.__exec({
        sql: util.format('INSERT INTO %s VALUES (?,?,?)', table),
        params: [null, 'username', 'password']
      });
      multi.exec(function(err, results) {
        promise.emit('success', results);
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
        promise.emit('success', results);
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
      // Query with sql
      multi.query({sql: util.format('SELECT * FROM %s', table)});
      // Query with sql + params
      multi.query({
        sql: util.format('SELECT * FROM %s WHERE id=?', table),
        params: [2]
      });
      // Query with sql + params + appendSql
      multi.query({
        sql: util.format('SELECT id,user FROM %s WHERE id=? OR id=1', table),
        params: [2],
        appendSql: 'ORDER BY id DESC'
      });
      multi.exec(function(err, results) {
        promise.emit('success', results);
      });
      return promise;
    },
    
    'Returns valid results': function(results) {
      var q1 = results[0][0],
          q2 = results[1][0],
          q3 = results[2][0];
      assert.strictEqual(q1[0].id, 1);
      assert.strictEqual(q1[1].id, 2);
      assert.strictEqual(q2[0].id, 2);
      assert.strictEqual(q3[0].id, 2);
      assert.strictEqual(q3[1].id, 1);
    }
    
  }
  
}).export(module);

















