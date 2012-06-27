
/**
  @module engines
  @namespace engine
 */

var kernel = protos.requireDependency('kernel', 'Kernel Engine'),
    util = require('util'),
    generator = kernel.generator,
    parser = kernel.parser,
    tokenizer = kernel.tokenizer,
    helpers = kernel.helpers;

/**
  Kernel engine class
  
  https://github.com/c9/kernel
  
  @class Kernel
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function Kernel(app) {
  this.app = app;
  this.module = kernel;
  this.async = true;
  this.multiPart = true;
  this.extensions = ['kernel', 'kernel.html', 'k.html', 'khtml'];
}

util.inherits(Kernel, protos.lib.engine);

Kernel.prototype.render = function(data) {
  data = this.app.applyFilters('kernel_template', data);
  var tpl, func = this.getCachedFunction(arguments);
  if (func === null) {
    tpl = this.compile.apply(this, arguments);
    if (typeof tpl == 'function') {
      func = function(locals, callback) {
        tpl(locals, function(err, html) {
          callback.call(null, html || err);
        });
      }
    } else {
      func = tpl; // Errors compiling template
    }
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

Kernel.prototype.compile = function(source, vars, relPath) {
  /*jshint evil:true */
  try {
    return new Function("var helpers = this;\nreturn " 
    + generator(parser(tokenizer(source), source, this.app.fullPath(relPath))))
    .call(helpers);
  } catch(e) {
    return e;
  }
}

module.exports = Kernel;
