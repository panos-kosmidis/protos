
/* Logger » File Transport */

var app = protos.app;

function FileTransport(evt, file) {
  
  // Get file stream
  var stream = app.logger.getFileStream(file);
  
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