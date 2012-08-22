/**
  @module engines
  @namespace engine
 */

var kiwi = require('kiwi'),
    util = require('util');

/**
  Kiwi engine class

  https://github.com/coolony/kiwi

  @class Kiwi
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function Kiwi(app) {
  this.app = app;

  var opts = (app.config.engines && app.config.engines.kiwi) || {};

  this.options = protos.extend({
    strict : false,
    cache : false
  }, opts);

  this.module = kiwi;
  this.async = true;
  this.multiPart = false;
  this.extensions = ['kiwi', 'kw.html'];
}

util.inherits(Kiwi, protos.lib.engine);

Kiwi.prototype.render = function(data, vars, relPath) {
  data = this.app.applyFilters('kiwi_template', data);
  var template, path, options, func = this.getCachedFunction(arguments);
  if (func === null) {
    path = (relPath && relPath[0] == '/') ? relPath :  this.app.fullPath(this.app.mvcpath + 'views/' + relPath);
    options = protos.extend(this.options, {path: path});
    template = new kiwi.Template(data, options);
    func = function(locals, callback) {
      template.render(locals, function(err, out) {
        callback(err || ((out.trim instanceof Function) ? out.toString() : new Error("Kiwi Error")));
      });
    };
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

Kiwi.prototype.syncPartial = function(func) {
  return func;
}

module.exports = Kiwi;