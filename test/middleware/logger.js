
var app = require('../fixtures/bootstrap'),
    fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    EventEmitter = require('events').EventEmitter;

var logging = app.logging;

var logMessage, redis, mongodb;

app.on('test_log', function(log) {
  redis = app.logger.transports.test.redis;
  mongodb = app.logger.transports.test.mongodb;
  logMessage = log.trim();
});

var accessLogMessage;

app.on('access_log', function(log) {
  accessLogMessage = log;
});

vows.describe('Logger (middleware)').addBatch({
  
  'Log Transports': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      var db = app.config.drivers,
          sto = app.config.storages;
      
      fs.writeFileSync(app.fullPath('/log/test.log'), '', 'utf-8');
      fs.writeFileSync(app.fullPath('/log/json.log'), '', 'utf-8');
      
      // Remove date from json log data, test filter
      app.addFilter('test_log_json', function(log) {
        log.pid = process.pid;
        delete log.date;
        return log;
      });
      
      app.use('logger', {
        accessLogFile: 'access.log',
        accessLogConsole: false,
        infoLevel: null,
        errorLevel: null,
        testLevel: {
          file: 'test.log',
          console: true,
          json: {
            stdout: true,
            filename: 'json.log',
            transports: {
              mongodb: {
                host: db.mongodb.host,
                port: db.mongodb.port,
                database: db.mongodb.database
              }
            }
          },
          mongodb: {
            host: db.mongodb.host,
            port: db.mongodb.port,
            logLimit: 1
          },
          redis: {
            host: sto.redis.host,
            port: sto.redis.port,
            logLimit: 1
          }
        }
      });
      
      app.globals.nativeLog = {msg: "This log should be stored as native JSON", date: new Date().toGMTString()};
      
      app.testLog('This event should be logged!');
      
      setTimeout(function() {
        
        console.log('');
        
        var results = {};
        
        var collection = app.logger.transports.test.mongodb.collection;
        
        collection.find({}, function(err, cursor) {
          cursor.toArray(function(err, docs) {
            
            var doc = docs.pop();

            results.mongodb = (docs.length === 0 && doc.log === logMessage);
            
            var redis = app.logger.transports.test.redis.client;
            redis.lrange('test_log', 0, -1, function(err, res) {
              if (err) results.redis = err;
              else {
                var doc = res.pop();
                results.redis = (res.length === 0 && doc == logMessage);
              }
              
              results.file = fs.readFileSync(app.fullPath('/log/test.log', 'utf-8')).toString().trim() === logMessage;
              
              var expectedJson = '{"level":"test","host":"localhost","msg":"This event should be logged!","pid":' + process.pid + '}';
              var obtainedJson = fs.readFileSync(app.fullPath('/log/json.log', 'utf-8')).toString().trim();
              
              results.json = expectedJson == obtainedJson;
              
              // Test native logs
              app.logger.transports.test.mongodb.write(app.globals.nativeLog);
              
              collection = app.logger.transports.test.mongodb.collection;
              
              collection.find({}, function(err, cursor) {
                cursor.toArray(function(err, docs) {
                  var doc = docs.pop();
                  results.native = (doc.log.msg == app.globals.nativeLog.msg && doc.log.date == app.globals.nativeLog.date);
                  
                  // Test log forwarding
                  
                  app.logger.transports.test.json.otherTransports.mongodb.collection.find({}, function(err, cursor) {
                    cursor.toArray(function(err, docs) {
                      var doc = docs.pop();
                      
                      results.forwarding = (doc.log === logMessage);
                      
                      promise.emit('success', results);
                      
                    });
                  });
                  
                });
              });
              
            });
            
          });
        });
        
      }, 1000);
      
      return promise;
    },
    
    "Stores logs using the JSON Transport": function(results) {
      assert.isTrue(results.json);
    },
    
    "Stores logs using the File Transport": function(results) {
      assert.isTrue(results.file);
    },
    
    "Stores logs using the Redis Transport": function(results) {
      assert.isTrue(results.redis);
    },
    
    "Stores logs using the MongoDB Transport": function(results) {
      assert.isTrue(results.mongodb);
    },
    
    "MongoDB Transport stores native JSON logs": function(results) {
      assert.isTrue(results.native);
    },
    
    "Successfully forwards logs to other Transports": function(results) {
      assert.isTrue(results.forwarding);
    }
    
  }
  
}).addBatch({
  
  'Access Log': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      var logFile = app.fullPath('/log/access.log');
      
      fs.writeFileSync(logFile, '', 'utf-8');
      
      app.logger.config.accessLogConsole = true;
      
      console.log('');
      
      app.curl('/', function(err, res) {
        
        app.logger.config.accessLogConsole = false;
        
        console.log('');
        
        if (err) promise.emit('success', err);
        else {
          
          // Account for Disk I/O
          setTimeout(function() {
            
            var buf = fs.readFileSync(logFile, 'utf-8').toString().trim();
            
            promise.emit('success', buf);
            
          }, 300); 
          
        }
      });
      
      return promise;
    },
    
    "Successfully stores access logs": function(log) {
      assert.equal(log, accessLogMessage);
    }
    
  }
  
}).export(module);
