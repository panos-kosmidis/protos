
/* Logger » Console Transport */

var app = protos.app;

function ConsoleTransport(evt) {

  app.on(evt, function(log, data) {
    console.log(log);
  });
  
  this.className = this.constructor.name;

}

module.exports = ConsoleTransport;