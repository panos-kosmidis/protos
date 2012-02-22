
/* Static Server » Asset manager */

var app = corejs.app,
    fs = require('fs'),
    util = require('util'),
    fileModule = require('file'),
    config = app.config.staticServer;

// Do nothing if no compilation is required
if (config.compile.length == 0) return;

var assets = {},
    extRegex = new RegExp('\\.(' + config.compile.join('|') + ')$');

// Prevent access to raw source files
if (! config.assetSourceAccess) {
  app.on('static_file_request', function(req, res, path) {
   if (extRegex.test(path.trim())) {
     req.stopRoute();
     app.notFound(res);
   }
  });
}

// Scan for files to compile
fileModule.walkSync(app.fullPath(app.paths.public), function(dirPath, dirs, files) {
  for (var matches, path, ext, file, i=0; i < files.length; i++) {
    file = files[i].trim();
    path = dirPath.trim() + '/' + file;
    matches = path.match(extRegex);
    if (matches) {
      ext = matches[1];
      if (! assets[ext]) assets[ext] = [];
      assets[ext].push(path);
    }
  }
});

// TODO: REMOVE
config.watchOn = [];

var watch = (config.watchOn.indexOf(corejs.environment) >= 0),
    assetExts = Object.keys(assets);

for (var compiler, files, ext, i=0; i < assetExts.length; i++) {
  ext = assetExts[i];
  compiler = config.compilers[ext];
  files = assets[ext];
  for (var src, file, outSrc, outFile, j=0; j < files.length; j++) {
    if (watch) new Watcher(files[j], compiler);
    else {
      file = files[j];
      src = fs.readFileSync(file, 'utf8');
      outSrc = compiler(src);
      outFile = file.replace(extRegex, '.' + config.compileExts[ext]);
      fs.writeFileSync(outFile, outSrc, 'utf8');
      app.debug(util.format('Asset Manager: Compiled %s (%s)', app.relPath(outFile), ext));
    }
  }
}

/**
  Asset watcher
  
  @param {string} path: Path to asset
  @param {function} compiler: Function to use to compile buffer
  @return {string} compiled asset
 */

function Watcher(path, compiler) {
  console.exit('Watching ' + path);
}