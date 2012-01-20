
function Initialize(app) {

  app.debugMode = true;
  
  var store = app.getResource('storages/redis');
  
  var multi = store.multi();
  
  multi.get('name');
  multi.get('name');
  multi.get('hey');
  multi.get('name');
  
  multi.exec(function(err, results) {
    console.exit([err, results]);
  });
}

module.exports = Initialize;