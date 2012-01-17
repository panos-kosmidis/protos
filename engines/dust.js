
/* Dust 

   The Dust engine uses `require.paths`, which has been deprecated in recent
   versions of node. The dust module should be manually created.
   
   When the dust module gets updated, things will be done following standard
   procedures.

*/ 

var s,
    fs = require('fs'),
    vm = require('vm'),
    util = require('util'),
    dustPath = './node_modules/dust/lib/'
    compiler = framework.require(dustPath + 'compiler.js'),
    parser = framework.require(dustPath + 'parser.js'),
    dustSrc = fs.readFileSync(dustPath + 'dust.js', 'utf-8'),
    idx = dustSrc.indexOf(s='})(dust);'),
    dust = createDustModule();

// https://github.com/akdubya/dustjs

function Dust(app) {
  this.app = app;
  this.module = dust;
  this.async = true;
  this.multiPart = true;
  this.extensions = ['dust'];
}

util.inherits(Dust, framework.lib.engine);


Dust.prototype.render = function(data, vars, relPath) {
  
  var tpl, compiled, tplID, 
      app = this.app,
      func = this.getCachedFunction(arguments);
  
  if (func === null) {
    tplID = util.format('%s:%s', app.domain, relPath); 
    compiled = dust.compile(data, tplID);
    dust.loadSource(compiled);
    
    if (typeof dust.cache[tplID] === 'function') {
      func = function(locals, callback) {
        dust.render(tplID, locals, function(err, html) {
          if (err) { html = ''; app.log('Dust: ' + err.toString()); }
          callback.call(null, html);
        });
      }
    } else {
      func = dust.cache[tplID] || new Error('Error rendering Dust template'); // Errors compiling template
    }
    
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

Dust.prototype.asyncPartial = function(func) {
  return function(arg, callback) {
    func(arg, function(buf) {
      callback(buf);
    });
  }
}

Dust.prototype.syncPartial = function(func) {
  return function(arg, callback) {
    callback(func(arg));
  }
}

function createDustModule() {
  // Manually prepare dust (from dust/lib/server.js)
  var dust;
  dustSrc = dustSrc.slice(0, idx) + s + '\ndust;';
  dust = vm.runInThisContext(dustSrc);
  compiler.parse = parser.parse;
  dust.compile = compiler.compile;
  dust.nextTick = process.nextTick;
  dust.optimizers = compiler.optimizers;
  
  dust.loadSource = function(source, path) {
    return vm.runInNewContext(source, {dust: dust}, path);
  }

  return dust;
}

module.exports = Dust;