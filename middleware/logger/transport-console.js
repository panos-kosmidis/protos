
/* Logger » Console Transport */

var app = corejs.app;

function ConsoleTransport(evt) {

  app.on(evt, console.log);
  
  this.className = this.constructor.name;

}

module.exports = ConsoleTransport;