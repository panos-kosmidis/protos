
function Initialize(app) {

  app.debugMode = true;
  
  var sto = app.getResource('storages/redis');
  
  setTimeout(function() {
    sto.get('name', function(err, value) {
       console.exit(err || value);
     });
  }, 1000);
  
}

module.exports = Initialize;