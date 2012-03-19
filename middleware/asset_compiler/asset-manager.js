
/* Asset manager */

var app = protos.app,
    fs = require('fs'),
    util = require('util'),
    fileModule = require('file'),
    config = app.asset_compiler;

// Do nothing if no compilation is required
if (config.compile.length === 0) return;

var assets = {},
    extRegex = new RegExp('\\.(' + config.compile.join('|') + ')$');
    
// console.exit(extRegex);

// Prevent access to raw source files
if (! config.assetSourceAccess) {
  app.on('static_file_request', function(req, res, path) {
    if (extRegex.test(path) || ignores.indexOf(path) >= 0) {
      req.stopRoute();
      app.notFound(res);
    }
  });
}

// Get ignores
var target, arr, ignores = [];

for (target in config.minify) {
  arr = config.minify[target];
  if (!Array.isArray(arr)) arr = [arr];
  for (var i=0; i < arr.length; i++) {
    ignores.push(app.fullPath('public/' + arr[i]));
  }
}

// console.exit(ignores);

// Scan for files to compile
fileModule.walkSync(app.fullPath(app.paths.public), function(dirPath, dirs, files) {
  for (var matches, path, ext, file, i=0; i < files.length; i++) {
    file = files[i].trim();
    path = dirPath.trim() + '/' + file;
    if (ignores.indexOf(path) >= 0) continue;
    matches = path.match(extRegex);
    if (matches) {
      ext = matches[1];
      if (! assets[ext]) assets[ext] = [];
      assets[ext].push(path);
    }
  }
});

// Cleanup ignores, only leave compiled sources that are not 
// allowed, since they're being minified. Asset sources are
// normally blocked. This improves performance on array index lookup.
ignores = ignores.filter(function(item) {
  return !extRegex.test(item);
});

// console.exit(ignores);
// console.exit(assets);

// config.watchOn = [];

var watch = (config.watchOn.indexOf(protos.environment) >= 0),
    assetExts = Object.keys(assets);
    
if (watch) app.debug('Asset Manager: Watching files in ' + app.paths.public);

// Loop over each file and determine what to do
for (var compiler, files, ext, i=0; i < assetExts.length; i++) {
  ext = assetExts[i];
  compiler = config.compilers[ext];
  files = assets[ext];
  for (var src, file, outSrc, outFile, j=0; j < files.length; j++) {
    if (watch) new Watcher(files[j], compiler);
    else compileSrc(files[j], compiler);
  }
}

function compileSrc(file, compiler) {
  var src, outFile;
  src = fs.readFileSync(file, 'utf8');
  compiler(src, function(err, code) {
    if (err) app.log(err);
    outFile = file.replace(extRegex, '.' + config.compileExts[ext]);
    fs.writeFileSync(outFile, code, 'utf8');
    app.debug(util.format('Asset Manager: Compiled %s (%s)', app.relPath(outFile), ext));
  });
}

/**
  Asset watcher
  
  @param {string} path: Path to asset
  @param {function} compiler: Function to use to compile buffer
  @return {string} compiled asset
 */
 
function Watcher(path, compiler) {
  compileSrc(path, compiler);
  var watcher = fs.watch(path, function(event, filename) {
    if (event == 'change') compileSrc(path, compiler);
    else if (event == 'rename') {
      app.log(util.format("Asset Manager: Stopped watching '%s' (renamed)", app.relPath(path)));
      watcher.close();
    }
  });
}
