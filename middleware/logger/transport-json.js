
/* Logger » JSON Transport */

var app = protos.app;

function JSONTransport(evt, config, level) {

  if (typeof config == 'string') {
    config = {filename: config}; // Accept filename as config
  } else if (typeof config == 'boolean') {
    config = {console: true}; // Accept boolean as config
  }

  // Create write stream for json filename
  if (config.filename) var stream = app.logger.getFileStream(config.filename);

  app.on(evt, function(log, data) {
    log = app.applyFilters(evt, {
      level: level,
      host: app.hostname,
      date: new Date().toGMTString(),
      msg: data[0]
    });
    log = JSON.stringify(log);
    if (stream) stream.write(log+'\n', 'utf8');
    if (config.console) console.log(log);
  });
  
  this.className = this.constructor.name;
  
}

module.exports = JSONTransport;