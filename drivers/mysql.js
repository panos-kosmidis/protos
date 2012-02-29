
/* MySQL */

var _ = require('underscore'),
    mysql = require('mysql'),
    util = require('util'),
    regex = { endingComma: /, ?$/};

function MySQL(app, config) {
  
  /** config: {
    host: 'localhost',
    port: 3306,
    user: 'db_user',
    password: 'db_password',
    database: 'db_name',
    debug: false,
    cachePrefix: null,
    storage: 'redis'
  } */
  
  var self = this;
  
  config = config || {};
  config.host = config.host || 'localhost';
  config.port = config.port || 3306;
  
  this.className = this.constructor.name;
  this.app = app;
  this.config = config;
  
  corejs.async(app); // Register async queue
  
  corejs.util.checkPort(config.port, function(err) {

    corejs.done(app); // Flush async queue
    
    if (err) {
      app.log(util.format("MySQL [%s:%s] %s", config.host, config.port, err.code));
      self.client = err;
    } else {
      // Set client
      self.client = mysql.createClient(config);

      // Assign storage
      if (typeof config.storage == 'string') {
        self.storage = app.getResource('storages/' + config.storage);
      } else if (config.storage instanceof corejs.lib.storage) {
        self.storage = config.storage;
      }
      
      // Set db
      self.db = config.database;
      
      // Set caching function
      if (self.storage != null) {
        self.cacheClientMethods(self.client, 'query');
        self.setCachePrefix(config.cachePrefix || null);
      }
      
    }
    
  });
  
  // Only set important properties enumerable
  corejs.util.onlySetEnumerable(this, ['className', 'db']);
  
}

util.inherits(MySQL, corejs.lib.driver);

/**
  Queries rows from a table

  @example
  
    mysql.query({
      sql: 'SELECT * FROM table WHERE id=? AND user=?',
      params: [id, user],
      appendSql: ''
    }, function(err, results, fields) {
      console.log([err, results, fields]);
    });

  @param {object} o
  @param {function} callback
  @public
*/

MySQL.prototype.query = function(o, callback) {
  var args,
      sql = o.sql || '',
      params = o.params || [],
      appendSql = o.appendSql || '';
  
  if (!util.isArray(params)) params = [params];
  
  args = [(sql + " " + appendSql).trim(), params, callback];
  
  this.addCacheData(o, args);
  
  this.client.query.apply(this.client, args);
}

/**
  Executes a query that is not expected to provide any results

  @example

    mysql.exec({
      sql: 'SHOW TABLES',
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
  @public
*/

MySQL.prototype.exec = function(o, callback) {
  var args, 
      self = this,
      sql = o.sql || '',
      params = o.params || [];
  
  if (!util.isArray(params)) params = [params];
  
  args = [sql, params];
  args.push(function(err, info) {
    callback.call(self, err, info);
  });
  
  this.addCacheData(o, args);
  
  this.client.query.apply(this.client, args);
}

/**
  Queries rows when condition is satisfied

  @example

    mysql.queryWhere({
      condition: 'id=?',
      params: [1],
      table: 'users'
    }, function(err, results, fields) {
      console.log([err, results, fields]);
    });

  @param {object} o
  @param {function} callback
  @public
 */

MySQL.prototype.queryWhere = function(o, callback) {
  var args, 
      self = this,
      condition = o.condition || '',
      params = o.params || [],
      table = o.table || '',
      columns = o.columns || '*',
      appendSql = o.appendSql || '';

  if (!util.isArray(params)) params = [params];
  
  args = [("SELECT " + columns + " FROM " + table + " WHERE " + condition + " " + appendSql).trim(), params];
  
  args.push(function(err, results, fields) {
    callback.call(self, err, results, fields);
  });
  
  this.addCacheData(o, args);
  
  // console.exit(args);
  
  this.client.query.apply(this.client, args);
}

/**
  Queries all rows in a table
  
  @example

    mysql.queryAll({
      columns: 'user, pass',
      table: 'users'
    }, function(err, results, fields) {
      console.log([err, results, fields]);
    });

  @param {object} o
  @param {function} callback
  @public
 */

MySQL.prototype.queryAll = function(o, callback) {
  var args, cdata, 
      self = this,
      columns = o.columns || '*',
      table = o.table || '',
      appendSql = o.appendSql || '';
  
  args = [("SELECT " + columns + " FROM " + table + " " + appendSql).trim()];
  
  args.push(function(err, results, columns) {
    callback.call(self, err, results, columns);
  });
  
  this.addCacheData(o, args);

  this.client.query.apply(this.client, args);
}

/**
  Queries fields by ID

  @example

    mysql.queryById({
      id: [1,3],
      table: 'users'
    }, function(err, results, fields) {
      console.log([err, results, fields]);
    });
  
  @param {object} o
  @param {function} callback
  @public
 */

MySQL.prototype.queryById = function(o, callback) {
  var args,
      id = o.id,
      table = o.table || '',
      columns = o.columns || '*',
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [{
    condition: "id IN (" + (id.toString()) + ")",
    table: table,
    columns: columns,
    appendSql: appendSql
  }, callback];
  
  // Transfer cache keys to object in first arg
  this.addCacheData(o, args[0]);
  
  this.queryWhere.apply(this, args);
}

/**
  Inserts values into a table

  @example

    mysql.insertInto({
      table: 'users',
      values: {user: 'hello', pass: 'passme'}
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
  @public
 */

MySQL.prototype.insertInto = function(o, callback) {
  var args, params, query, 
      self = this,
      table = o.table || '',
      values = o.values || {};
      
  if (util.isArray(values)) {
    params = corejs.util.strRepeat('?, ', values.length).replace(regex.endingComma, '');
    args = ["INSERT INTO " + table + " VALUES(" + params + ")", values];
  } else {
    query = "INSERT INTO " + table + " SET ";
    if (values.id == null) values.id = null;
    for (var key in values) {
      query += key + "=?, ";
    }
    query = query.replace(regex.endingComma, '');
    args = [query, _.values(values)];
  }
  
  args.push(function(err, info) {
    callback.call(self, err, info);
  });
  
  this.addCacheData(o, args);
  
  // console.exit(args);
  
  this.client.query.apply(this.client, args);
}

/**
  Deletes records by ID

  @example

    mysql.deleteById({
      id: 4,
      table: 'users'
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
  @public
  */

MySQL.prototype.deleteById = function(o, callback) {
  var args,
      id = o.id,
      table = o.table || '',
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [{
    condition: "id IN (" + (id.toString()) + ")",
    table: table,
    appendSql: appendSql
  }, callback]
  
  // Transfer cache keys to object in first arg
  this.addCacheData(o, args[0]);
  
  this.deleteWhere.apply(this, args);
}

/**
  Deletes rows where condition is satisfied
  
  @example

    mysql.deleteWhere({
      condition: 'id=?',
      params: [5],
      table: 'users'
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
  @public
 */

MySQL.prototype.deleteWhere = function(o, callback) {
  var args, 
      self = this,
      condition = o.condition || '',
      params = o.params || [],
      table = o.table || '',
      appendSql = o.appendSql || '';
      
  if (!util.isArray(params)) params = [params];
  
  args = ["DELETE FROM " + table + " WHERE " + condition + " " + appendSql, params];
  
  args.push(function(err, info) {
    callback.call(self, err, info);
  });
  
  this.addCacheData(o, args);
  
  this.client.query.apply(this.client, args);
}

/**
  Updates records by ID
  
  @example

    mysql.updateById({
      id: 1,
      table: 'users',
      values: {user: 'ernie'}
    }, function(err, info) {
      console.log([err, info]);
    });

  @param {object} o
  @param {function} callback
  @public
 */

MySQL.prototype.updateById = function(o, callback) {
  var args,
      id = o.id,
      table = o.table || '',
      values = o.values || {},
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [{
    condition: "id IN (" + (id.toString()) + ")",
    table: table,
    values: values,
    appendSql: appendSql
  }, callback]
  
  // Transfer cache keys to first arg
  this.addCacheData(o, args[0]);
  
  this.updateWhere.apply(this, args);
}

/**
  Updates rows where condition is satisfied
  
  @example

    mysql.updateWhere({
      condition: 'id=?',
      params: [1],
      table: 'users',
      values: {user: 'ernie'}
    }, function(err, info) {
      console.log([err, info]);
    });
  
  @param {object} o
  @param {function} callback
  @public
 */

MySQL.prototype.updateWhere = function(o, callback) {
  var args,query, 
      self = this,
      condition = o.condition || '',
      params = o.params || [],
      table = o.table || '',
      values = o.values || {},
      appendSql = o.appendSql || '';
  
  query = "UPDATE " + table + " SET ";
  
  if (!util.isArray(params)) params = [params];
  
  for (var key in values) {
    query += key + "=?, ";
  }
  
  query = query.replace(regex.endingComma, '');
  query += " WHERE " + condition + " " + appendSql;
  
  args = [query, _.values(values).concat(params)];
  
  args.push(function(err, info) {
    callback.call(self, err, info);
  });
  
  this.addCacheData(o, args);
  
  this.client.query.apply(this.client, args);
}

/**
  Counts rows in a table

  @example

    mysql.countRows({
      table: table
    }, function(err, count) {
      console.log([err, count]);
    });

  @param {object} o
  @param {function} callback
  @public
 */

MySQL.prototype.countRows = function(o, callback) {
  var args, 
      self = this,
      table = o.table || '';
      
  args = ["SELECT COUNT('') AS total FROM " + table, []];
  
  args.push(function(err, results, fields) {
    args = err ? [err, null] : [err, results[0].total];
    callback.apply(self.app, args);
  });
  
  this.addCacheData(o, args);
  
  this.client.query.apply(this.client, args);
}

/**
  Queries rows by ID, returning an object with the ID's as keys,
  which contain the row (if found), or null if the row is not found.

  @example

    mysql.idExists({
      id: [1,2],
      table: 'users'
    }, function(err, results) {
      console.log([err, results]);
    });

  @param {object} o
  @param {function} callback
  @public
 */

MySQL.prototype.idExists = function(o, callback) {
  var args, 
      self = this,
      id = o.id,
      table = o.table || '',
      columns = o.columns || '*',
      appendSql = o.appendSql || '';
  
  if (typeof id == 'number') id = [id];
  
  args = [o]; // Passing unmodified `o`
  
  args.push(function(err, results, fields) {
    if (err) {
      callback.call(self, err, null);
    } else {
      if (id.length == 1) {
        callback.call(self, null, results[0]);
      } else {
        var num,
            found = [],
            records = {},
            exists = {};
        for (var result, i=0; i < results.length; i++) {
          result = results[i];
          found.push(result.id);
          records[result.id] = results[i];
        }
        for (i=0; i < id.length; i++) {
          num = id[i];
          exists[num] = (found.indexOf(num) >= 0) ? records[num] : null;
        }
        callback.apply(self.app, [null, exists]);
      }
    }
  });
  
  // No need to transfer cache keys, since `o` is passed unmodified
  
  this.queryById.apply(this, args);
}

// Model methods. See lib/driver.js for Model API docs

MySQL.prototype.__modelMethods = {
  
  /** Model API insert */
  
  insert: function(o, cdata, callback) {
    var self = this;
    
    // Process callback & cache Data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }
    
    // Validate, throw error on failure
    this.validateProperties(o);

    // Save data into the database
    this.driver.insertInto(_.extend({
      table: this.context,
      values: o
    }, cdata), function(err, results) {
      if (err) callback.call(self, err, null);
      else {
        callback.call(self, null, results.insertId);
      }
    });
  },
  
  /** Model API get */
  
  get: function(o, cdata, callback) {
    var self = this;
    
    // Process callback & cache data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }
    
    if (typeof o == 'number') { 
      // If `o` is number: Convert to object
      o = {id: o};
    } else if (util.isArray(o)) {
      
      // If `o` is an array of params, process args recursively using multi
      var arr = o, 
          multi = this.multi();
      for (var i=0; i < arr.length; i++) {
        multi.get(arr[i], cdata);
      }
      multi.exec(function(err, results) {
        callback.call(self, err, results);
      });
      return;
      
    } else if (typeof o == 'object') {
      
      // IF `o` is object: Validate without checking required fields
      this.propertyCheck(o);
      
    } else {
      
      callback.call(self, new Error(util.format("%s: Wrong value for `o` argument", this.className)), null);
      return;
      
    }
      
    // Prepare custom query
    var condition, key, value,
        keys = [], values = [];
    
    for (key in o) {
      keys.push(key);
      values.push(o[key]);
    }
    
    // Prevent empty args
    if (keys.length === 0) {
      callback.call(self, new Error(util.format("%s: Empty arguments", this.className)));
      return;
    } else {
      condition = keys.join('=? AND ') + '=?';
    }
    
    // Get model data & return generated model (if found)
    this.driver.queryWhere(_.extend({
      condition: condition,
      params: values,
      table: this.context,
    }, cdata), function(err, results) {
      if (err) callback.call(self, err, null);
      else {
        if (results.length === 0) callback.call(self, null, null);
        else {
          var model = self.createModel(results[0]);
          callback.call(self, null, model);
        }
      }
    });
  },
  
  /** Model API getAll */
  
  getAll: function(cdata, callback) {
    var self = this, models = [];

    // Process callback & cache data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }

    this.driver.queryAll(_.extend({
      table: this.context
    }, cdata), function(err, results) {
      if (err) callback.call(self, err, null);
      else {
        for (var i=0; i < results.length; i++) {
          models.push(self.createModel(results[i]));
        }
        callback.call(self, null, models);
      }
    });

  },
  
  /** Model API save */
  
  save: function(o, cdata, callback) {
    var id, self = this;
    
    // Process callback & cache data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }
    
    // Update data. Validation has already been performed by ModelObject
    id = o.id; 
    delete o.id;
    this.driver.updateById(_.extend({
      id: id,
      table: this.context,
      values: o
    }, cdata), function(err, results) {
      callback.call(self, err);
    });
  },
  
  /** Model API delete */
  
  delete: function(id, cdata, callback) {
    var self = this;
    
    // Process callback & cache data
    if (typeof callback == 'undefined') { callback = cdata; cdata = {}; }

    if (typeof id == 'number' || id instanceof Array) {
      
      // Remove entry from database
      this.driver.deleteById(_.extend({
        id: id,
        table: this.context,
        appendSql: 'LIMIT 1'
      }, cdata), function(err, results) {
        callback.call(self, err);
      });
      
    } else {
      
      callback.call(self, new Error(util.format("%s: Wrong value for `id` parameter", this.className)));
      
    }

  }
  
}

module.exports = MySQL;
