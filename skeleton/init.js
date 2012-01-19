
function Initialize(app) {

  app.debugMode = true;
  app.asyncQueueTimeout = 0;
  
  var randFunc = function(callback) {
    var t = Math.ceil(Math.random()*2000);
    console.log('Started: ' + t);
    setTimeout(function() {
      callback.call(null, 'Finished: ' + t);
    }, t);
  }
  
  var context = {
    method1: randFunc,
    method2: randFunc,
    method3: randFunc,
    method4: randFunc
  }
  
  var multi = new framework.Multi(context, {parallel: true});
  
  multi.method1();
  multi.method2();
  multi.method3();
  multi.method4();
  multi.exec(function(err, results) {
    console.exit(err || results);
  });
  
}

module.exports = Initialize;