
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
CREATE TEMPORARY TABLE %s (\n\
  id INTEGER AUTO_INCREMENT NOT NULL,\n\
  user VARCHAR(255),\n\
  pass VARCHAR(255),\n\
  PRIMARY KEY (id)\n\
)', table);

/*
Driver API:
===========

1) Storage Operations
  'exec',
  'insertInto',

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
  
}).export(module);