
/**
  @module engines
  @namespace engine
 */

var jinjs = require('jinjs'),
    path = require('path'),
    util = require('util'),
    extend = protos.extend;

/**
  JinJS engine class
  
  https://github.com/ravelsoft/node-jinjs
  
  @class JinJS
  @extends Engine
  @constructor
  @param {object} app Application Instance
 */

function JinJS(app) {
  this.app = app;
  
  var opts = (app.config.engines && app.config.engines.jinjs) || {};
  
  this.options = protos.extend({
    cache : true
  }, opts);
  
  this.module = jinjs;
  this.multiPart = false;
  this.extensions = ['jin', 'jinjs', 'jin.html'];
  
  // Register extensions to be available in require
  this.extensions.forEach(function (val) {
    var extension = path.extname('.' + val);
    
    if (0 === extension.length) {
      extension = '.' + val;
    }

    jinjs.registerExtension(extension);
  });
}

util.inherits(JinJS, protos.lib.engine);

JinJS.prototype.render = function(data, vars, relPath) {
  data = this.app.applyFilters('jinjs_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    var filename = (relPath && relPath[0] == '/') ? relPath :  this.app.fullPath(this.app.mvcpath + 'views/' + relPath);
    var options = extend({path: filename}, this.options);
    var template = require(filename);

    func = function(locals) {
      return template.render(locals);
    };
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = JinJS;
