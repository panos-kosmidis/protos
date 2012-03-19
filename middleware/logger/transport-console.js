
/* Logger » Console Transport */

var app = protos.app;

function ConsoleTransport(evt) {

  app.on(evt, console.log);
  
  this.className = this.constructor.name;

}

module.exports = ConsoleTransport;