
/* Asset Minifier */

var app = protos.app,
    fs = require('fs'),
    util = require('util'),
    config = app.asset_compiler,
    Multi = require('multi');
    
var cleancss = require('clean-css'),
    uglifyjs = require('uglify-js');

var minifyTargets = Object.keys(config.minify);

var compiler = new Multi({
  getSource: function(file, callback) {
    file = app.fullPath('public/' + file);
    var ext = getExt(file);
    var source = fs.readFileSync(file, 'utf-8').toString();
    if (ext in config.compilers) {
      config.compilers[ext](source, file, callback);
    } else {
      callback(null, source);
    }
  }
});

// Uglifyjs internals
var jsp = uglifyjs.parser;
var pro = uglifyjs.uglify;

// Recursive minification
function minification() {
  var sources, target = minifyTargets.shift();
  if (target) {
    sources = config.minify[target];
    if (!Array.isArray(sources)) sources = [sources];
    sources.forEach(function(item, i) {
      compiler.getSource(item);
    });
    compiler.exec(function(err, compiled) {
      if (err) throw err;
      else {
        var ext = getExt(target);
        target = app.fullPath('public/' + target);
        if (ext == 'css') {
          var source = cleancss.process(compiled.join('\n'));
          fs.writeFileSync(target, source, 'utf8');
          app.debug("Asset Compiler: Minified CSS: " + app.relPath(target));
        } else if (ext == 'js') {
          var ast = jsp.parse(compiled.join('\n'), config.uglifyOpts.strictSemicolons);   // Initial AST
          if (config.uglifyOpts.mangle) ast = pro.ast_mangle(ast);                        // Mangled names
          if (config.uglifyOpts.liftVariables) ast = pro.ast_lift_variables(ast)          // Declare vars at top of scope
          if (config.uglifyOpts.squeeze) ast = pro.ast_squeeze(ast);                      // Compression optimizations
          var outSrc = pro.gen_code(ast);                                                 // Compressed code
          fs.writeFileSync(target, outSrc, 'utf8');
          app.debug("Asset Compiler: Minified JavaScript: " + app.relPath(target));
        } else {
          throw new Error("Asset Compiler: Extension not supported: " + target);
        }
        minification();
      }
    });
  }
}

/*
mangle: true,
squeeze: true,
liftVariables: false,
strictSemicolons: false
*/

function getExt(file) {
  return file.slice(file.lastIndexOf('.')+1).trim().toLowerCase();
}

// Run
minification();