
/**
  Application

  Application class, available locally (on a per-application basis) as `app`.

  @extends EventEmitter
 */

var _ = require('underscore'),
    slice = Array.prototype.slice,
    http = require('http'),
    fileModule = require('file'),
    pathModule = require('path'),
    urlModule = require('url'),
    qs = require('qs'),
    fs = require('fs'),
    vm = require('vm'),
    cp = require('child_process'),
    util = require('util'),
    mime = require('mime'),
    isTypeOf = corejs.util.isTypeOf,
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var parseRange = corejs.util.parseRange;

function Application(domain, path) {

  var self = this, listenPort, portStr;

  this.domain = domain;
  this.path = path;
  this.className = this.constructor.name;
  corejs.apps[this.domain] = this;

  this.initialized = false;

  // Directory to store the models, views, controllers & helpers
  // Defaults to skeleton root. Must start/end with a slash.
  this.mvcpath = path + '/app/';

  this.paths = {
    layout: '__layout/',
    restricted: '__restricted/',
    static: '__static/',
    public: 'public/',
    upload: 'incoming/',
  }

  this.views = {
    static: [],
    buffers: {},
    callbacks: {},
    partials: {}
  }

  this.logging = true;
  this.debugMode = false;
  this.viewCaching = false;

  this.loginUrl = '/login';
  this.debugColor = '0;37';

  this.drivers = {};
  this.cache = {};
  this.storages = {};
  this.helpers = {};
  this.controllers = {};
  this.models = {};
  this.engines = {};
  this.defaultEngine = null;
  this.config = {};
  this.globals = {};
  this.routes = {};

  this.httpMethods = corejs.httpMethods;
  this.httpStatusCodes = http.STATUS_CODES;

  this.supports = {};
  this.resources = {};

  this.__enableFeatures = {
    session: function(config) {
      this.session = new corejs.lib.session(this, config);
    },
    response_cache: function(storage) {
      this.resources.response_cache = (typeof storage == 'string')
      ? this.getResource('storages/' + storage)
      : storage;
    }
  };

  // Store filters
  this.__filters = {};

  // Attach configuration
  this.config = parseConfig.call(this);

  // Regular expressions, extend corejs's
  this.regex = _.extend(this.config.regex, corejs.regex);

  // App early initialization event (available on environments)
  corejs.emit('pre_init', this);

  // Structure application's baseUrl
  listenPort = corejs.config.server.listenPort;
  portStr = listenPort !== 80 ? ":" + listenPort : '';
  this.baseUrl = "http://" + this.domain + portStr;

  // Get constructors from lib/
  var requireCb;

  // Get instances from helpers/
  var instance, helperCtor = corejs.lib.helper;
  corejs.util.requireAllTo(this.mvcpath + "helpers", this.helpers, function(Ctor) {
    util.inherits(Ctor, helperCtor);
    instance = new Ctor(self);
    instance.className = instance.constructor.name;
    return instance;
  });

  // Create storages
  createStorages.call(this);

  // Create drivers
  createDrivers.call(this);

  // Get models/
  var model, name, modelCtor = corejs.lib.model;
  corejs.util.requireAllTo(this.mvcpath + "models", this.models, function(Ctor) {
    util.inherits(Ctor, modelCtor);
    model = new Ctor();
    model.prepare(self);
    name = model.className[0].toLowerCase() + model.className.slice(1);
    self[name] = model;
    return model;
  });
  
  // Get corejs view engines
  this.enginesByExtension = {};
  var engine, engineProps = ['className', 'extensions'];
  for (engine in corejs.engines) {
    instance = new corejs.engines[engine](this);
    instance.className = instance.constructor.name;
    corejs.util.onlySetEnumerable(instance, engineProps);
    this.engines[engine] = instance;
  }

  // Register engine extensions
  var exts = [];
  for (var key in this.engines) {
    engine = this.engines[key];
    exts = exts.concat(engine.extensions);
    for (var i=0; i < engine.extensions.length; i++) {
      key = engine.extensions[i];
      this.enginesByExtension[key] = engine;
    }
  }

  // Override engine extensions (from config)
  var ext, extOverrides = this.config.viewExtensions;
  for (ext in extOverrides) {
    if (exts.indexOf(ext) == -1) exts.push(ext); // Register extension on `exts`
    engine = this.engines[extOverrides[ext]]; // Get engine object
    engine.extensions.push(ext); // Add ext to engine extensions
    this.enginesByExtension[ext] = engine; // Override engine extension
  }

  // Set default template engine
  this.defaultEngine = this.engines.hogan;

  // Add the engines regular expression
  this.engineRegex = new RegExp('^(' + Object.keys(this.engines).join('|').replace(/\-/, '\\-') + ')$');

  // Get controllers/
  var cpath = this.mvcpath + 'controllers/',
      files = corejs.util.getFiles(cpath);

  // Create controllers and attach to app
  var controllerCtor = corejs.lib.controller;
  var controller, file, className, Ctor;
  for (i=0; i < files.length; i++) {
    file = files[i];
    key = file.replace(this.regex.jsFile, '');
    className = file.replace(this.regex.jsFile, '');
    Ctor = require(cpath + className);
    Ctor = monkeyPatchController.call(this, Ctor);
    instance = new Ctor(this);
    instance.className = instance.constructor.name;
    this.controllers[key.replace(/_controller$/, '')] = instance;
    corejs.util.runInitFunction(instance);
  }
  
  // MainController is set as the main controller
  this.controller = this.controllers.main;

  // Generate template file regex from registered template extensions
  this.regex.templateFile = new RegExp('\\.(' + exts.join('|') + ')$');
  this.templateExtensions = exts;

  // Generate static file regex
  this.views.static = corejs.util.ls(this.mvcpath + "views/" + this.paths.static, this.regex.templateFile);
  this.views.staticAsoc = {};
  this.views.pathAsoc = {};

  // Associate static paths with their respective templates
  for (file,key,i=0; i < this.views.static.length; i++) {
    file = this.views.static[i];
    key = file.replace(this.regex.templateFile, '');
    this.views.staticAsoc['/' + key] = file;
  }

  var regex = '^\\/(',
    staticViews = this.views.static;

  // Get directories in public/
  files = getStaticDirs.call(this);

  // Iterate over files and append to regex
  var dir, re;
  for (i=0; i < files.length; i++) {
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

  // Partial & tempalte regexes
  var partialRegex = new RegExp('^_[a-zA-Z0-9-_]+\\.(' + exts.join('|') + ')$'),
      templateRegex = new RegExp('\\.(' + exts.join('|') + ')$');

  // Build partial views and add path associations
  var partialPaths = [];
  fileModule.walkSync(this.mvcpath + 'views', function(dirPath, dirs, files) {
    var layoutPath = self.fullPath(self.mvcpath + 'views/' + self.paths.layout);
    for (var path,file,i=0; i < files.length; i++) {
      file = files[i];
      path = dirPath + "/" + file;
      if (partialRegex.test(file)) {
        // Only build valid partial views
        partialPaths.push(path);
        self.buildPartialView(path);
      } else if (templateRegex.test(file)) {
        // Build partial views for everything inside app.paths.layout
        if (path.indexOf(layoutPath) === 0) {
          partialPaths.push(path);
          self.buildPartialView(path);
        }
        // Only add valid templates to view associations
        self.views.pathAsoc[self.relPath(path.replace(self.regex.templateFile, ''))] = path;
      }
    }

  });

  this.emit('partials', this.views.partials, partialPaths);

  // console.exit(this);
}

util.inherits(Application, EventEmitter);

Application.prototype.asyncQueue = [];

/**
  Initializes the application
 */

Application.prototype.initialize = function() {
  delete this.asyncQueue;

  // Emit the init event
  this.emit('init', this);

  // Run initialization code from init.js
  this.require('init').call(null, this);

  // Set initialized state
  this.initialized = true;
}

/**
  Enables a specific feature.

  Makes available through `app.supports`.

  E.g. `app.enable('session')` will provide
  `app.supports.session` with true

  @param {string} feature
  @param {object} config
  @public
 */

Application.prototype.enable = function(feature, config) {
  this.supports[feature] = true;
  this.__enableFeatures[feature].call(this, config);
}

 /**
  Registers an enable event

  @param {string} feature
  @param {function} callback
  @public
 */

Application.prototype.registerEnable = function(feature, callback) {
  if (feature in this.__enableFeatures) this.debug('The feature "' + feature + '" has been replaced.');
  this.__enableFeatures[feature] = callback;
}

/**
  Requires an application's module, relative to the application's path

  @param {string} module
  @returns {object}
  @public
 */

Application.prototype.require = function(module) {
  try {
    return require(this.path + "/node_modules/" + module);
  } catch (e) {
    module = module.replace(this.regex.relPath, '');
    return require(this.path + "/" + module);
  }
}

/**
  Loads middleware

  @param {string} component
  @param {object} options
  @param {boolean} skipCheck
  @returns {object} instance of the component's function
  @public
 */

Application.prototype.use = function(middleware, options) {

  var callback,
    path = this.path + "/middleware/" + middleware + ".js";
  if ( pathModule.existsSync(path) ) {
    callback = require(path);
  } else {
    path = corejs.path + "/lib/middleware/" + middleware + ".js";
    if ( !pathModule.existsSync(path) ) {
      throw new Error("Component can't be found: " + middleware);
    }
    callback = require(path);
  }
  callback.call(null, this, options);

  return this;
}

/**
  Routes a request based on the application's controllers, routes & static views

  @param {object} req
  @param {object} res
  @private
 */

Application.prototype.routeRequest = function(req, res) {

  var queryData,
    urlData = parseUrl(req.url),
    url = urlData.pathname,
    controller;

  // Set request properties
  res.app = req.app = this;
  res.request = req;
  req.response = res;
  req.route = {};
  req.urlData = urlData;
  req.params = {};
  req.session = {};
  req.isStatic = false;
  res.__setCookie = [];
  req.__handledRoute = false;
  res.__headers = _.extend({}, this.config.headers);
  
  // Check for the X-Requested-With header to detect ajax
  req.isAjax = (req.headers['x-requested-with'] == 'XMLHttpRequest');

  // Emit  the `request` event.
  this.emit('request', req, res);
  if (req.__stopRoute === true) return;

  // Load query data
  if ( req.method == 'GET' && isTypeOf(req.urlData.query, 'string') ) {
    queryData = qs.parse(req.urlData.query);
    req.__queryData = queryData;
  } else {
    req.__queryData = {};
  }

  // Strict routing, account for case sensitivity
  if (!this.config.server.strictRouting) {
    url = req.urlData.pathname = req.urlData.pathname.toLowerCase();
  }

  if (url == '/' || this.regex.singleParam.test(url)) {

    req.__isMainRequest = true;

    controller = (url !== '/')
    ? (this.controller.getControllerByAlias(url) || this.controller)
    : this.controller;

    controller.processRoute.call(controller, urlData, req, res, this);

  } else {

    req.__isMainRequest = null;
    this.controller.exec.call(this.controller, urlData, req, res, this);

  }

  // If route has been handled, return
  if (req.__handledRoute) return;

  // Static file requests

  if ( req.method == 'GET' && (this.staticFileRegex.test(url) || this.regex.fileWithExtension.test(url)) ) {

    req.isStatic = true;
    this.emit('static_file_request', req, res);

    if (req.__stopRoute === true) return;

    var filePath = this.path + "/" + this.paths.public + url;

    this.serveStatic(filePath, req, res);

  }

}

/**
  Serves a static file

  @param {string} path
  @param {object} req
  @param {object} res
  @private
 */

Application.prototype.serveStatic = function(path, req, res) {

  var callback, self = this;

  if ( pathModule.basename(path).charAt(0) == '.' ) {

    this.notFound(res);

  } else {

    fs.stat(path, callback = function(err, stats) {

      if (err || stats.isDirectory()) {

        // File not found
        self.notFound(res);

      } else  {

        var date = new Date(),
          now = date.toUTCString(),
          lastModified = stats.mtime.toUTCString(),
          contentType = mime.lookup(path),
          maxAge = self.config.cacheControl.maxAge;

        date.setTime(date.getTime() + maxAge * 1000);

        var expires = date.toUTCString(),
          isCached = ( (req.headers['if-modified-since'] != null)
          && lastModified === req.headers['if-modified-since'] );

        // Static headers
        var headers = {
          'Content-Type': contentType,
          'Cache-Control': self.config.cacheControl.static + ", max-age=" + maxAge,
          'Last-Modified': lastModified,
          'Content-Length': stats.size,
          Expires: expires
        };

        // Etags
        var enableEtags = self.config.staticServer.eTags;
        if (enableEtags === true) {
          headers.Etag = JSON.stringify([stats.ino, stats.size, Date.parse(stats.mtime)].join('-'));
        } else if (typeof enableEtags == 'function') {
          headers.Etag = enableEtags(stats);
        }

        // Return cached content
        if (isCached) {
          res.statusCode = 304;
          self.emit('static_file_headers', req, res, headers, stats, path);
          res.sendHeaders(headers);
          res.end();
          return;
        }

        var acceptRanges = self.config.staticServer.acceptRanges;
        if (acceptRanges) headers['Accept-Ranges'] = 'bytes';

        var stream, streamArgs = [path];

        if (acceptRanges && (req.headers.range != null)) {

          // Handle partial range requests

          var start, end, len,
          ranges = (parseRange(stats.size, req.headers.range) || [])[0];

          if (ranges != null) {
            start = ranges.start;
            end = ranges.end;
            streamArgs.push({start: start, end: end});
            len = end - start + 1;
            res.statusCode = 206; // HTTP/1.1 206 Partial Content
            res.setHeaders({
              'Content-Range': "bytes " + start + "-" + end + "/" + stats.size
            });
          } else {
            res.statusCode = 416; // HTTP/1.1 416 Requested Range Not Satisfiable
            headers.Connection = 'close';
            res.sendHeaders(headers);
            res.end('');
            return;
          }

        } else {
          // Make sure statusCode is set to 200
          res.statusCode = 200;
        }

        // Prepare an asyncrhonous file stream
        stream = fs.createReadStream.apply(null, streamArgs);

        stream.on('error', function(err) {
          self.serverError(res, ["Unable to read " + self.relPath(path) + ": " + err.toString()]);
        });

        // When stream is ready
        stream.on('open', function() {
          self.emit('static_file_headers', req, res, headers, stats, path);
          res.sendHeaders(headers);
          stream.pipe(res);
        });

      }

    });

  }

}

/**
  Validates request data (both for GET & POST), against the validation rules
  provided when defining the route.

  If the validation is not successful, a response of HTTP/400 is given.

  @param {object} req
  @param {object} fields
  @param {boolean} onlyCheck
  @returns {boolean}, if onlyCheck is true
  @private
 */

Application.prototype.validate = function(req, fields, onlyCheck) {
  var msg, regex, param, exclude,
    res = req.response,
    route = req.route,
    messages = route.messages,
    paramKeys = route.paramKeys,
    valid = true,
    counter = 0;

  if (route.validation != null) {

    for (param in fields) {
      fields[param] = fields[param].trim();

      if (route.validation[param] != null) {
        counter++;

        if ( typeof route.validation[param] == 'string' && route.validation[param] in app.regex ) {
          regex = this.regex[route.validation[param]];
        } else regex = route.validation[param];

        if ( regex.test(fields[param]) ) {
          fields[param] = corejs.util.typecast(fields[param]);
          continue;
        } else {
          req.__invalidParam = [ param, fields[param] ];

          if (req.method == 'POST') req.__postData.files.removeAll();

          if (onlyCheck) return false;

          if ( messages != null && messages[param] != null ) {

            if (typeof messages[param] == 'function') {
              msg = messages[param].call(this, fields[param]);
            } else msg = messages[param];

          } else msg = "Invalid: " + fields[param];

          res.rawHttpMessage(400, msg);

          return false;
        }
      } else {
        continue;
      }
    }

    exclude = 0;
    var key, val;
    for (key in req.params) {
      val = req.params[key];
      if (val !== undefined) exclude++;
    }

    if (counter !== (paramKeys.length - exclude)) {

      if (req.method == 'POST' && req.__postData.files instanceof corejs.lib.filemgr) {
        req.__postData.files.removeAll();
      }

      if (onlyCheck) return false;

      res.rawHttpMessage(400, 'Missing required fields');

      return false;

    } else {
      return valid;
    }
  } else {

    return true;

  }
}

/**
  Returns the web application's URL of a relative path

  @param {string} path
  @returns {string}
  @public
 */

Application.prototype.url = function(path) {
  var baseUrl;
  if (path == null) path = '';
  baseUrl = this.baseUrl + "/" + (path.replace(this.config.regex.startsWithSlashes, '')
  .replace(this.config.regex.multipleSlashes, '/'));
  return baseUrl;
}

/**
  Redirects to the login location, specified in app.loginUrl

  @param {object} res
  @public
 */

Application.prototype.login = function(res) {
  var controller = res.__controller,
    req = res.request,
    route = req.route;

  if (this.loginUrl) {
    if (controller.className == 'MainController' && route.path === this.loginUrl) {
      route.callback.call(controller, req, res, req.params);
    } else {
      res.redirect(this.loginUrl);
    }
  } else {
    res.rawHttpMessage(401); // Unauthorized
  }

}

/**
  Redirects to the web application's home url

  @param {object} res
  @public
 */

Application.prototype.home = function(res) {
  res.redirect("/");
}

/**
  Logging facility for the application with timestamp.

  Can be disabled by setting `app.logging` to false.

  @param {string} context
  @param {string} msg
  @public
 */

Application.prototype.log = function(msg) {
  if ( !this.logging || typeof msg == 'undefined') return;
  var log = util.format('%s (%s) - %s', this.domain, this.date(), msg);
  if (msg instanceof Error) console.trace(log);
  else console.log(log);
}

/**
  Prints debugging messages when on Debug Mode.

  Debug Mode can be enabled by setting `app.debugMode` to true.

  @param {string} msg
  @public
 */

Application.prototype.debug = function(msg) {
  if ( this.debugMode !== true ) return;
  msg = util.format('\u001b[%sm%s (%s) - %s\u001b[0m', this.debugColor, this.domain, this.date(), msg);
  console.log(msg);
}

/**
  Returns a path relative to the application's path

  @param {string} path
  @param {string} offset
  @returns {string} relative path without offset
  @public
 */

Application.prototype.relPath = function(path, offset) {
  var p = this.path + "/";
  if (offset != null) {
    p += offset.replace(this.regex.startOrEndSlash, '') + '/';
  }
  return path.replace(p, '');
}

/**
  Returns the absolute path for an application's relative path

  @param {string} path
  @returns {string}
  @public
 */

Application.prototype.fullPath = function(path) {
  path = path.replace(this.regex.startOrEndSlash, '');
  return this.path + "/" + path;
}

/**
  Returns the current date without extra timezone information

  @returns {string}
  @public
 */

Application.prototype.date = function() {
  var date = (new Date()).toString(),
    match = date.match(this.regex.dateFormat);
  return match[0];
}

/**
  Checks if a static view exists

  @param {string} url
  @returns {boolean}
  @private
 */

Application.prototype.staticViewExists = function(url) {
  var exists = false,
      staticViews = this.views.static;

  url = url.replace(this.regex.startOrEndSlash, '');

  for (var ext,i=0; i < this.templateExtensions.length; i++) {
    ext = this.templateExtensions[i];
    if (staticViews.indexOf(url + '.' + ext) >= 0) {
      exists = true;
      break;
    }
  }

  return exists;
}

/**
  Returns an HTTP/404 Response

  @param {object} res
  @public
 */

Application.prototype.notFound = function(res) {
  var cb, self = this;
  this.loadCookies(res.request);

  cb = function() {
    res.render('#404', self.config.rawViews);
  }

  if (this.session) {
    this.session.loadSession(res.request, res, cb);
  } else {
    cb.call(this);
  }
}

/**
  Returns an HTTP/400 Response

  @param {object} res
  @param {array} logData
  @public
 */

Application.prototype.badRequest = function(res, logData) {
  this.loadCookies(res.request);
  var cb = function() {
    res.rawHttpMessage(400, logData);
  }
  if (this.session) {
    this.session.loadSession(res.request, res, cb);
  } else {
    cb.call(this);
  }
}

/**
  Returns an HTTP/500 Response, using the template

  @param {object} res
  @param {array} logData
  @public
 */

Application.prototype.serverError = function(res, logData) {
  var cb, self = this;
  this.loadCookies(res.request);

  cb = function() {
    res.render('#500', {}, true);
    if (logData != null) {
      self.emit('server_error', logData);
      self.log(logData);
    }
  }

  if (this.session) {
    this.session.loadSession(res.request, res, cb);
  } else {
    cb.call(this);
  }
}

/**
  Returns a raw HTTP/500 Response

  @param {object} res
  @param {string} message
  @param {array} logData
  @public
 */

Application.prototype.rawServerError = function(res, message, logData) {

  this.loadCookies(res.request);

  var cb = function() {
    res.rawHttpMessage(500, message, logData);
  }

  if (this.session) {
    this.session.loadSession(res.request, res, cb);
  } else {
    cb.call(this);
  }
}

/**
  Returns a string representation of the application object

  @returns {string}
  @public
 */

Application.prototype.toString = function() {
  return console.log("{ Application " + this.domain + " " + this.path + "}");
}

/**
  Loads request cookies

  @param {object} req
  @return {object}
  @private
 */

Application.prototype.loadCookies = function(req) {
  if (req.__cookies != null) return;
  return req.__cookies = getRequestCookies(req);
}

/**
  Builds a partial view and caches its function

  @param {string} path
  @private
 */

Application.prototype.buildPartialView = function(path) {

  var pos = path.indexOf('.'),
      ext = path.slice(pos+1),
      engine = this.enginesByExtension[ext],
      func = engine.renderPartial(path);

  path = path.slice(0, pos);

  var id = path
    .replace(this.mvcpath + 'views/', '')
    .replace(/\/(_)?/g,'_')
    .replace(/^__/, '');

  func.id = id;

  this.views.partials[id] = func;
}

/**
  Returns a new driver instance

  @param {string} driver
  @param {object} config
  @public
 */

Application.prototype.driver = function(driver, config) {
  return new corejs.drivers[driver](this, config || {});
}

/**
  Returns a new storage instance

  @param {string} driver
  @param {object} config
  @public
 */

Application.prototype.storage = function(storage, config) {
  return new corejs.storages[storage](this, config || {});
}

/**
  Gets a resource (driver or storage), using the config schema

  example:

    app.getResource('drivers/mysql');
    app.getResource('storages/redis:queryCache');

  @param {string} driver
  @returns {object} driver in app.drivers
  @private
 */

Application.prototype.getResource = function(schemeStr, callback) {
  var db, section, source, out,
      self = this,
      scheme = schemeStr.split('/');

  // If a resource is provided, return
  if (scheme.length == 1) {
    if (callback instanceof Function) {
      this.getResource('resources/' + schemeStr, callback);
    } else {
      return this.getResource('resources/' + schemeStr);
    }
  }

  source = scheme[0];
  scheme = scheme[1];

  if (scheme.indexOf(':') > 0) {
    scheme = scheme.split(':');
    db = scheme[0].trim();
    section = scheme[1].trim();
    out = this[source][db][section];
  } else {
    out = this[source][scheme];
  }

  if (out == null) {
    throw new Error(util.format("Unable to find resource: '%s'", schemeStr));
  } else if (callback) {
    if (out.client == null) {
      // Wait until client is initialized
      this.on('init', function() {
        callback.call(self, out);
      });
    } else {
      // Client already initialized
      callback.call(self, out);
    }
  } else {
    return out;
  }
}

/**
  Performs a curl request for an application's resource

  Provides [err, buffer]

  Example:

      app.curl('-X PUT /hello', function(err, buffer) {
        console.log([err, buffer]);
      });

  @param {string} cmd
  @param {function} callback
  @public
 */

Application.prototype.curl = function(cmd, callback) {
  cmd = cmd.trim();
  var leftStr, requestUrl,
      self = this,
      wsIndex = cmd.lastIndexOf(' ');
  if (wsIndex >= 0) {
    leftStr = cmd.slice(0, wsIndex);
    requestUrl = cmd.slice(wsIndex).trim();
    cmd = (requestUrl.indexOf('http://') === 0)
    ? leftStr + ' ' + requestUrl
    : leftStr + ' ' + this.baseUrl + requestUrl;
  } else {
    if (cmd.indexOf('http://') == -1) cmd = this.baseUrl + cmd;
  }
  cmd = 'curl ' + cmd;
  cp.exec(cmd, function(err, stdout, stderr) {
    var buf = err ? stderr : stdout;
    callback.call(self, err, buf);
  });
}

/**
  Creates a client request for an application's resource

  Provides: [err, buffer, headers]

  Example:

      app.clientRequest({
        path: '/hello',
        method: 'PUT'
      }, function(err, buffer, headers) {
        console.log([err, buffer, headers])
      });

      app.clientRequest('/hello', function(err, buffer, headers) {
        console.log([err, buffer, headers]);
      });

  @param {object|string} o
  @param {function} callback
  @public
*/

Application.prototype.clientRequest = function(o, callback) {
  var path, method, headers, self = this;

  if (typeof o == 'string') {
    path = o;
    method = 'GET';
  } else {
    path = o.path || '/';
    method = o.method || 'GET';
  }

  headers = o.headers || {};

  var req = http.request({
    host: self.domain,
    port: corejs.config.server.listenPort,
    method: method,
    path: path,
    headers: headers
  }, function(res) {
    var data = '';
    res.on('data', function(chunk) {
      data += chunk.toString('utf-8');
    });
    res.on('end', function() {
      callback.call(self, null, data, res.headers);
    });
  });

  req.on('error', function(err) {
    callback.call(self, err, null, null);
  });

  req.end();
}

/**
  Adds a filter

  @param {string} filter
  @param {function} callback
  @public
 */

Application.prototype.addFilter = function(filter, callback) {
  var arr = this.__filters[filter];
  if (util.isArray(arr)) {
    arr.push(callback);
  } else {
    this.__filters[filter] = [callback];
  }
  return this; // Enable chaining
}

/**
  Applies filters to specific data

  @param {string} filter
  @param {mixed} value
  @public
 */

Application.prototype.applyFilters = function() {
  var filters = this.__filters[arguments[0]];
  if (util.isArray(filters)) {
    var temp = arguments[1];
    for (var i=0; i < filters.length; i++) {
      temp = filters[i].call(this, temp);
    }
    return temp;
  } else {
    return arguments[1];
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

/**
  Helper function, equivalent to url.parse()

  @param {string} url
  @returns {object}
  @public
 */

function parseUrl(url) {
  return urlModule.parse(url);
}

/**
  Parses the request cookies

  @param {object} req
  @returns {object}
  @private
 */

function getRequestCookies(req) {
  if (req.headers.cookie != null) {
    try {
      return parseCookie(req.headers.cookie);
    } catch (e) {
      this.log(req.urlData.pathname, "Error parsing cookie header: " + e.toString());
      return {};
    }
  } else {
    return {};
  }
}

/**
  Enhances the controller function, allowing it to inherit the Controller class. Also allows
  the controller to locally use the static routing functions.

  @param {function} func
  @returns {function}
  @private
 */

function monkeyPatchController(func) {

  var context, newFunc, compile,
      funcSrc = func.toString();
  var code = funcSrc
      .trim()
      .replace(/^function\s+(.*?)(\s+)?\{(\s+)?/, '')
      .replace(/(\s+)?\}$/, '');

  // Get source file path
  var alias = corejs.lib.controller.prototype.getAlias(func.name),
      srcFile = this.mvcpath + 'controllers/' + alias + '.js';
  
  try {
    var source = fs.readFileSync(srcFile, 'utf-8');
  } catch(e){
    var source = fs.readFileSync(srcFile.replace(/\.js$/, '_controller.js'), 'utf-8');
  }

  // Detect pre & post function code
  var si = source.indexOf(funcSrc),
      preFuncSrc = source.slice(0, si).trim(),
      postFuncSrc = source.slice(si + funcSrc.length).trim();

  // Controller code

  var fnCode = "\n\
with (locals) {\n\n\
function "+ func.name +"(app) {\n\
  this.prepare.call(this, app);\n\
}\n\n\
require('util').inherits("+ func.name +", corejs.lib.controller);\n\n\
corejs.extend(" + func.name + ", corejs.lib.controller);\n\
\n";

  // Controller code, within closure

  fnCode += "\n\
(function() { \n\n\
" + preFuncSrc + "\n\n\
with(this) {\n\n\
  " + code + "\n\n\
}\n\n\
" + postFuncSrc + "\n\n\
}).call(" + func.name + ");\n\n\
"+ func.name +".prototype.authRequired = ("+ func.name +".authRequired) ? true\n\
: corejs.lib.controller.prototype.authRequired;\n\n\
return " + func.name + ";\n\n\
}\n";

  // console.exit(fnCode);

  /*jshint evil:true */
  compile = new Function('locals', fnCode);

  newFunc = compile({
    app: this,
    corejs: corejs,
    module: {},
    require: require,
    console: console,
    __dirname: this.mvcpath + 'controllers',
    __filename: srcFile,
    process: process
  });

  return newFunc;

}

/**
  Parses the application configuration

  @private
 */

function parseConfig() {
  var p = this.path + '/config/',
      files = corejs.util.getFiles(p),
      mainPos = files.indexOf('base.js'),
      jsExt = corejs.regex.jsFile,
      config = require(this.path + '/config/base.js');

  for (var file,key,cfg,i=0; i < files.length; i++) {
    if (i==mainPos) continue;
    file = files[i];
    key = file.replace(jsExt, '');
    cfg = require(this.path + '/config/' + file);
    if (typeof config[key] == 'object') _.extend(config[key], cfg);
    else config[key] = cfg;
  }

  return config;
}

/**
  Creates database drivers from config
 */

function createDrivers() {
  var cfg, def, x, y, z,
      config = this.config.database,
      drivers = this.drivers;

  for (x in config) {
    cfg = config[x];
    if (x == 'default') { def = cfg; continue; }
    for (y in cfg) {
      if (typeof cfg[y] == 'object') {
        if (typeof drivers[x] == 'undefined') drivers[x] = {};
        drivers[x][y] = this.driver(x, cfg[y]);
      } else {
        drivers[x] = this.driver(x, cfg);
        break;
      }
    }
  }

  if (def) drivers.default = this.getResource('drivers/' + def);
  else throw new Error('No default database set. Please check your config/database.');

  if (typeof drivers.default == 'undefined') {
    throw new Error(util.format("No driver available for '%s'.", def));
  }
}

/**
  Creates storages from config
 */

function createStorages() {
  var cfg, x, y, z,
      config = this.config.storage,
      storages = this.storages;

  for (x in config) {
    cfg = config[x];
    for (y in cfg) {
      if (typeof cfg[y] == 'object') {
        if (typeof storages[x] == 'undefined') storages[x] = {};
        storages[x][y] = this.storage(x, cfg[y]);
      } else {
        storages[x] = this.storage(x, cfg);
        break;
      }
    }
  }
}

/**
  Parses the cookie header

  @param {string} str
  @returns {object}
  @private
 */

function parseCookie(str) {
  var obj = {},
    pairs = str.split(/[;,] */);

  for (var pair,eqlIndex,key,val,i=0; i < pairs.length; i++) {
    pair = pairs[i];
    eqlIndex = pair.indexOf('=');
    key = pair.substr(0, eqlIndex).trim().toLowerCase();
    val = pair.substr(++eqlIndex, pair.length).trim();
    if ('"' === val[0]) val = val.slice(1, -1);
    if (obj[key] === undefined) {
      val = val.replace(/\+/g, ' ');
      try {
        obj[key] = decodeURIComponent(val);
      } catch (err) {
        if (err instanceof URIError) {
          obj[key] = val;
        } else {
          throw err;
        }
      }
    }
  }
  return obj;
}

module.exports = Application;
