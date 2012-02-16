
/* Static Server » Dependencies */

var app = corejs.app,
    fs = require('fs');

require('./application.js');
require('./response.js');

function StaticServer(config, middleware) {
  
  createStaticFileRegex.call(app);
  
  // Middleware configuration
  config = corejs.extend({
    eTags: true,
    acceptRanges: true
  }, config);
  
  // Attach configuration to app
  app.config.staticServer = config;
  
  app.debug('Static Server enabled');
}

/**
  Creates the static file regex
  
  @private
 */

function createStaticFileRegex() {

  var regex = '^\\/(',
    staticViews = this.views.static;

  // Get directories in public/
  var files = getStaticDirs.call(this);

  // Iterate over files and append to regex
  for (var path, dir, re, i=0; i < files.length; i++) {
    dir = files[i];
    path = dir.replace(this.regex.startOrEndSlash, '').replace(this.regex.regExpChars, '\\$1');
    if (i > 0) path = "|" + path;
    regex += path;
  }

  // Finalize & create regex
  regex += ')\\/?';

  if (regex == '^\\/()\\/?') {
    // No directories found in public/. Invalidate regex
    this.staticFileRegex = /^$/;
  } else {
    // Directories found in public/
    this.staticFileRegex = new RegExp(regex);
  }

}

/**
  Gets the static directories available in the application's public

  @returns {array}
  @private
 */

function getStaticDirs() {
  var files = fs.readdirSync(this.path + '/' + this.paths.public),
    dirs = [];
  for (var file, stat, i=0; i < files.length; i++) {
    file = files[i];
    stat = fs.lstatSync(this.path + '/' + this.paths.public + file);
    if ( stat.isDirectory() ) dirs.push(file);
  }
  return dirs;
}

module.exports = StaticServer;