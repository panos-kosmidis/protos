
/* Logger » File Transport */

var app = protos.app,
    fs = require('fs'),
    pathModule = require('path');

function FileTransport(evt, file) {
  file = file.trim();
  var path = (file.charAt(0) == '/') ? pathModule.resolve(file) : app.fullPath('log/' + file);
  var stream = fs.createWriteStream(path, {flags: 'a'});
  
  // Write file on log event
  app.on(evt, function(log) {
    stream.write(log+'\n', 'utf8');
  });
  
  Object.defineProperty(this, 'stream', {
    value: stream,
    writable: true,
    enumerable: false,
    configurable: false
  });
 
  this.className = this.constructor.name;
  
}

module.exports = FileTransport;