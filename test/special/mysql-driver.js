
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    Client = require('mysql').Client,
    EventEmitter = require('events').EventEmitter;
    
var mysql, multi;

/*
Driver API:
===========

[ 'query',
  'exec',
  'queryWhere',
  'queryAll',
  'queryById',
  'insertInto',
  'deleteById',
  'deleteWhere',
  'updateById',
  'updateWhere',
  'countRows',
  'idExists',
  'recordExists']
  
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
  'deleteWhere',

4) Rename Operations
  N/A

5) Update Operations
  'updateById',
  'updateWhere',


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
      assert.instanceOf(mysql.client, Client);
    }

  }
  
}).export(module);
