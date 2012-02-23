
function Initialize(app) {

  app.debugLog = true;

  var mongodb = app.getResource('drivers/mongodb'),
      multi = mongodb.multi();
  
  multi.queryWhere({
    collection: 'users',
    condition: {name: {$in: ['ernie', 'rachel']}},
    cacheID: 'users_cache'
  });
  
  multi.queryWhere({
    collection: 'ages',
    condition: {age: {$gt: 100}},
    cacheID: 'ages_cache'
  });
  
  multi.queryWhere({
    collection: 'users',
    condition: {name: {$in: ['ernie', 'rachel']}},
    cacheID: 'users_cache'
  });
  
  multi.queryWhere({
    collection: 'ages',
    condition: {age: {$gt: 100}},
    cacheID: 'ages_cache'
  });
  
  multi.exec(function(err, docs) {
    console.exit(docs);
  });
  
}

module.exports = Initialize;