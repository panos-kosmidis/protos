
/**
  Application

  Application class, available locally (on a per-application basis) as `app`.

  @extends EventEmitter
 */

var _ = require('underscore'),
    http = require('http'),
    fileModule = require('file'),
    pathModule = require('path'),
    urlModule = require('url'),
    crypto = require('crypto'),
    qs = require('qs'),
    fs = require('fs'),
    vm = require('vm'),
    cp = require('child_process'),
    util = require('util'),
    slice = Array.prototype.slice,
    isEmpty = _.isEmpty,
    isTypeOf = protos.util.isTypeOf,
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

function Application(domain, path) {

  protos.app = this;
  
  var inflect = this.inflect = protos.inflect;
  
  var listenPort, portStr, self = this;

  this.domain = domain;
  this.path = path;
  this.className = this.constructor.name;
  this.asyncQueue = [];

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
  this.debugLog = false;
  this.viewCaching = false;

  this.loginUrl = '/login';
  this.debugColor = '0;37';

  this.drivers = {};
  this.cache = {};
  this.storages = {};
  this.helpers = {};
  this.controllers = {};
  this.model = {}; // Contains model method aliases
  this.models = {}; // Contains model instances
  this.engines = {};
  this.defaultEngine = null;
  this.config = {};
  this.globals = {};
  this.routes = {};

  this.httpMethods = protos.httpMethods;
  this.httpStatusCodes = http.STATUS_CODES;

  // Client side data
  this.client = {
    scripts: [],
    stylesheets: []
  }

  // Stores booleans with middleware support/availability information
  this.supports = {};

  // To be used by middleware to store objects
  this.resources = {};

  // Store filters
  this.__filters = {};
  
  // Attach configuration
  this.config = parseConfig.call(this);

  // Regular expressions, extend protos's
  this.regex = _.extend(this.config.regex, protos.regex);

  // Structure application's baseUrl
  listenPort = protos.config.server.listenPort;
  portStr = listenPort !== 80 ? ":" + listenPort : '';
  this.baseUrl = "http://" + this.domain + portStr;

  // Application server, available early
  this.server = http.createServer(function(req, res) {
    req.startTime = Date.now();
    self.routeRequest(req, res);
  });

  // App early initialization event (available on environments)
  protos.emit('pre_init', this);

  // Get constructors from lib/
  var requireCb;

  // Get instances from helpers/
  protos.util.requireAllTo(this.mvcpath + "helpers", this.helpers, function(Ctor) {
    // Pseudo-inheritance: Copy helper prototype methods into MainHelper's prototype.
    // If util.inherits is used, it will replace any additions to the original prototype.
    if (Ctor.name == 'MainHelper') protos.extend(Ctor.prototype, protos.lib.helper.prototype);
    var instance = new Ctor(self);
    instance.className = instance.constructor.name;
    return instance;
  });

  for (var helper in this.helpers) {
    if (typeof this.helpers[helper] == 'undefined') {
      // Remove `undefined` helpers
      delete this.helpers[helper];
    } else {
      // Make helpers more accessible. E.g.: app.mainHelper => app.helpers.main
      this[inflect.camelize(helper+'-helper', true)] = this.helpers[helper];
    }
  }

  this.emit('helpers_init');

  // Create storages
  createStorages.call(this);

  this.emit('storages_init', this.storages);

  // Create drivers
  createDrivers.call(this);

  this.emit('drivers_init', this.drivers);

  // Get models/
  var model, name, modelCtor = protos.lib.model;
  if (Object.keys(this.config.database).length > 0) {
    protos.util.requireAllTo(this.mvcpath + "models", this.models, function(Ctor) {
      util.inherits(Ctor, modelCtor);
      model = new Ctor();
      model.prepare(self);
      name = model.className[0].toLowerCase() + model.className.slice(1);
      self[name] = model;
      return model;
    });
  }

  this.emit('models_init', this.models);

  // Get protos view engines
  this.enginesByExtension = {};
  var engine, instance, engineProps = ['className', 'extensions'];
  for (engine in protos.engines) {
    instance = new protos.engines[engine](this);
    instance.className = instance.constructor.name;
    protos.util.onlySetEnumerable(instance, engineProps);
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

  this.emit('engines_init', this.engines);

  // Get controllers/
  var cpath = this.mvcpath + 'controllers/',
      files = protos.util.getFiles(cpath);

  // Create controllers and attach to app
  var controllerCtor = protos.lib.controller;
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
  }

  // MainController is set as the main controller
  this.controller = this.controllers.main;

  this.emit('controllers_init', this.controllers);

  // Generate template file regex from registered template extensions
  this.regex.templateFile = new RegExp('\\.(' + exts.join('|') + ')$');
  this.templateExtensions = exts;

  // Generate static file regex
  this.views.static = protos.util.ls(this.mvcpath + "views/" + this.paths.static, this.regex.templateFile);
  this.views.staticAsoc = {};
  this.views.pathAsoc = {};

  // Associate static paths with their respective templates
  for (file,key,i=0; i < this.views.static.length; i++) {
    file = this.views.static[i];
    key = file.replace(this.regex.templateFile, '');
    this.views.staticAsoc['/' + key] = file;
  }

  // Partial & template regexes
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
        self._buildPartialView(path);
        watchPartial.call(self, path);
      } else if (templateRegex.test(file)) {
        // Build partial views for everything inside app.paths.layout
        if (path.indexOf(layoutPath) === 0) {
          partialPaths.push(path);
          self._buildPartialView(path);
          watchPartial.call(self, path);
        }
        // Only add valid templates to view associations
        self.views.pathAsoc[self.relPath(path.replace(self.regex.templateFile, ''))] = path;
      }
    }
  });

  // Helper Partials
  Object.keys(this.helpers).forEach(function(alias) {
    var m, method, hkey, helper = self.helpers[alias];
    for (m in helper) {
      if (helper[m] instanceof Function) {
        method = helper[m];
        hkey = (alias == 'main')
          ? util.format('$%s', m)
          : util.format('$%s_%s', alias, m);
        self.views.partials[hkey] = method;
      }
    }
  });

  this.emit('partials_init', this.views.partials, partialPaths);
  
  // console.exit(this.views.partials);

  // Initialize if no drivers or storages are present (no config set)
  if (isEmpty(this.config.database) && isEmpty(this.config.storage)) this.initialize();

  // console.exit(this);
}

util.inherits(Application, EventEmitter);

/**
  Initializes the application
 */

Application.prototype.initialize = function() {
  delete this.asyncQueue;

  // Set initialized state
  this.initialized = true;

  // Emit the init event
  this.emit('init', this);

  // Run initialization code from init.js
  this.require('init').call(null, this);

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
  req.isStatic = false;
  res.__context = null;
  res.__setCookie = [];
  req.__handledRoute = false;
  res.__headers = _.extend({}, this.config.headers);

  // Check for the X-Requested-With header to detect ajax
  req.isAjax = (req.headers['x-requested-with'] == 'XMLHttpRequest');

  // Emit  the `request` event.
  this.emit('request', req, res);
  if (req.__stopRoute === true) return;

  // On HEAD requests, redirect to request url
  if (req.method == 'HEAD') {
    this.emit('head_request', req, res);
    if (req.__stopRoute === true) return;
    res.redirect(req.url);
    return;
  }

  // Load query data
  if ( req.method == 'GET' && isTypeOf(req.urlData.query, 'string') ) {
    queryData = qs.parse(req.urlData.query);
    req.queryData = queryData;
  } else {
    req.queryData = {};
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

  if ( this.supports.static_server && this._isStaticFileRequest(req, res) ) {
    var filePath = (this.path + '/' + this.paths.public + url).trim();
    this._serveStaticFile(filePath, req, res);
  }

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

  @param {string} middleware  Middleware to load
  @param {object} options  Options to pass to the middleware constructor
  @returns {object} instance of the component's function
  @public
 */

Application.prototype.use = function(middleware, options) {
  var Ctor, p, path = this.path + '/middleware/' + middleware;

  if ( pathModule.existsSync(path + '.js') ) {
    // Load application middleware » js file
    Ctor = require(path + '.js');
  } else if ( pathModule.existsSync(path + '/' + middleware + '.js') ) {
    // Load application middleware » middleware.js
    Ctor = require(path + '/' + middleware + '.js');
  } else if ( pathModule.existsSync(path + '.coffee') ) {
    // Load application middleware » cs file
    Ctor = require(path + '.coffee');
  } else if ( pathModule.existsSync(path + '/' + middleware + '.coffee') ) {
    // Load application middleware » middleware.coffee
    Ctor = require(path + '/' + middleware + '.coffee');
  } else if ( pathModule.existsSync(path) ) {
    // Load application middleware » directory
    Ctor = require(path);
  } else {
    path = protos.path + '/middleware/' + middleware;
    if ( pathModule.existsSync(path + '.js') ) {
      // Load protos middleware » js file
      Ctor = require(path + '.js');
    } else if ( pathModule.existsSync(path + '/' + middleware + '.js') ) {
      // Load protos middleware » middleware.js
      Ctor = require(path + '/' + middleware + '.js');
    } else if ( pathModule.existsSync(path + '.coffee') ) {
      // Load protos middleware » cs file
      Ctor = require(path + '.coffee');
    } else if ( pathModule.existsSync(path + '/' + middleware + '.coffee') ) {
      // Load protos middleware » middleware.coffee
      Ctor = require(path + '/' + middleware + '.coffee');
    } else if ( pathModule.existsSync(path) ) {
      // Load protos middleware » directory
      Ctor = require(path);
    } else {
      throw new Error(util.format("Middleware not found: '%s'", middleware));
    }
  }

  // Register middleware support
  this.supports[middleware] = true;

  // Show debug message on load
  this.debug("Middleware: %s", middleware);

  if (Ctor instanceof Function) {
    // Middlewares attach themselves into the app singleton
    try {
      return new Ctor(options || {}, middleware);
    } catch(e) {
      console.exit(e.stack || e);
    }
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
          fields[param] = protos.util.typecast(fields[param]);
          continue;
        } else {
          req.__invalidParam = [ param, fields[param] ];

          if (this.supports.body_parser && (req.method == 'POST' || req.method == 'PUT')) {
            req.__requestData.files.removeAll();
          }

          // Note: onlyCheck is recommended only for GET requests.
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

      if (this.supports.body_parser && (req.method == 'POST' || req.method == 'PUT')) {
        req.__requestData.files.removeAll();
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
  Registers a view helper

  @param {string} alias View helper alias to use
  @param {function} func Function to use as helper
  @param {object} context Object to use as `this`
  @public
 */

Application.prototype.registerViewHelper = function(alias, func, context) {
  /*jshint immed: false */
  if (context) {
    // Run function in context
    (function() {

      var slice = Array.prototype.slice;
      this.views.partials[alias] = function() {
        return func.apply(context, slice.call(arguments, 0));
      }
    }).call(this);
  } else {
    // Assign func as partial
    this.views.partials[alias] = func;
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

Application.prototype.log = function() {
  var local = (this instanceof Application),
      self = (local) ? this : this.app;
  var data = self.logFormat.apply(this, [local, self, arguments]);
  if (!data) return; // Exit if no log data provided
  var msg = data[0], log = data[1];

  if (!self.supports.logger && self.logging) console.log(log);

  if (local) {
    if (msg instanceof Error) self.emit('error_log', log);
    else self.emit('info_log', log);
  } else {
    self.emit(this.event, log);
  }
}

/**
  Log Formatting method
  
  @param mixed
  @private
 */
 
Application.prototype.logFormat = function(local, self, args) {
  var level, msg;
  args = slice.call(args, 0);
  msg = args[0];

  switch (typeof msg) {
    case 'string':
      if (args.length > 0) { // printf-like args
        msg = util.format.apply(null, args);
      }
      break;
      
    case 'object':
      msg = util.inspect(msg);
      break;
      
    case 'undefined':
      return;
  }

  if (local) {
    level = (msg instanceof Error) ? 'error' : 'info';
  } else {
    level = this.level;
    if (level == 'error' && typeof msg == 'string') {
      msg = new Error(msg); // Convert msg to error to get stack trace
    } 
  }

  // Using msg.stack or msg, works both for strings and errors
  var log = util.format('%s (%s) [%s] %s', self.domain, self.date(), level, (msg.stack || msg));
  
  return [msg, log];
}

/**
  Prints debugging messages when on Debug Mode.

  Debug Mode can be enabled by setting `app.debugLog` to true.

  @param {string} msg
  @public
 */

Application.prototype.debug = function() {
  if ( this.debugLog !== true ) return;
  var msg = util.format.apply(this, arguments);
  msg = util.format('\u001b[%sm%s (%s) - %s\u001b[0m', this.debugColor, this.domain, this.date(), msg);
  console.log(msg);
}

/**
  Returns a cryptographic hash
  
  Notes:
    Hashing Algorithms: 'md5', 'sha1', 'sha256', 'sha512', etc...
    Input Encodings: 'utf8', 'ascii', 'binary'
    Digest Encodings: 'hex', 'binary', 'base64'
    
    For a full list of hash algorithms, run `$ openssl list-message-digest-algorithms`
    
    The base64 digest of hashes is performed against the actual binary hash data, not the hex string.
  
  References:
    http://nodejs.org/docs/v0.6.14/api/crypto.html#crypto_crypto_createhash_algorithm
    http://nodejs.org/docs/v0.6.14/api/crypto.html#crypto_hash_update_data_input_encoding
    http://nodejs.org/docs/v0.6.14/api/crypto.html#crypto_hash_digest_encoding
  
  Examples:
    var md5 = app.createHash('md5', "Hello World");
    var sha256 = app.createHash('sha256:hex', "Hello World");
    var sha512 = app.createHash('sha256:base64', "Hello World", 'utf8');
  
  @param {string} format  Hash format:  algorithm:[digest='hex']
  @param {string} str  String to calculate the hash against 
  @param {encoding} Encoding to use. Defaults to node's default ('binary')
  @returns {string} generated hash
  @public
 */
 
Application.prototype.createHash = function(format, str, encoding) {
  var algorithm, digest;
  format = format.split(':');
  algorithm = format[0];
  digest = format[1] || 'hex';
  return crypto.createHash(algorithm).update(str, encoding || 'binary').digest(digest);
}

/**
  Returns an md5 hash (hex)
  
  @param {string} str
  @param {string} encoding
  @returns {string}
  @public
 */
 
Application.prototype.md5 = function(str, encoding) {
  return this.createHash('md5', str, encoding);
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

var dateRepl = / [0-9]{4} /;

Application.prototype.date = function() {
  // Wed Feb 29 08:55:56
  return Date().slice(0, 24).replace(dateRepl, ' ');
}

/**
  Returns an HTTP/404 Response

  @param {object} res
  @public
 */

Application.prototype.notFound = function(res) {

  var cb, self = this;

  if (this.supports.cookie_parser) this._loadCookies(res.request);

  cb = function() {
    res.render('#404', self.config.rawViews);
  }

  if (this.supports.session) {
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
  if (this.supports.cookie_parser) this._loadCookies(res.request);
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

  if (this.supports.cookie_parser) this._loadCookies(res.request);

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

  if (this.supports.cookie_parser) this._loadCookies(res.request);

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
    port: protos.config.server.listenPort,
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
  Calls a function after application has initialized

  @param {function} callback
  @public
 */
 
Application.prototype.onInitialize = function(callback) {
  if (this.initialized) callback(this);
  else this.once('init', callback);
}

/**
  Checks if a static view exists

  @param {string} url
  @returns {boolean}
  @private
 */

Application.prototype._staticViewExists = function(url) {
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
  Builds a partial view and caches its function

  @param {string} path
  @private
 */

Application.prototype._buildPartialView = function(path) {

  var self = this;
  var p = pathModule.basename(path);

  var pos = p.indexOf('.'),
      ext = p.slice(pos+1),
      engine = this.enginesByExtension[ext],
      func = engine.renderPartial(path);

  // path = path.slice(0, pos);
  
  var id = path
    .replace(this.mvcpath + 'views/', '')
    .replace(/\/(_)?/g,'_')
    .replace(/^__/, '');
    
  id = id.slice(0, id.indexOf('.'));

  // console.exit(id);

  func.id = id;
  
  this.views.partials[id] = func;
}

/**
  Returns a new driver instance

  @param {string} driver
  @param {object} config
  @private
 */

Application.prototype._driver = function(driver, config) {
  return new protos.drivers[driver](this, config || {});
}

/**
  Returns a new storage instance

  @param {string} driver
  @param {object} config
  @private
 */

Application.prototype._storage = function(storage, config) {
  return new protos.storages[storage](this, config || {});
}

/**
  Gets a resource (driver or storage), using the config schema

  example:

    app._getResource('drivers/mysql');
    app._getResource('storages/redis:queryCache');

  @param {string} driver
  @returns {object} driver in app.drivers
  @private
 */

Application.prototype._getResource = function(schemeStr, callback) {
  var db, section, source, out,
      self = this,
      scheme = schemeStr.split('/');

  // If a resource is provided, return
  if (scheme.length == 1) {
    if (callback instanceof Function) {
      this._getResource('resources/' + schemeStr, callback);
    } else {
      return this._getResource('resources/' + schemeStr);
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
  Adds a filter

  @param {string} filter
  @param {function} callback
  @private
 */

Application.prototype.addFilter = function(filter, callback) {
  var arr = this.__filters[filter];
  if (arr instanceof Array) {
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
  @private
 */

Application.prototype.applyFilters = function() {
  var filters = this.__filters[arguments[0]];
  if (filters instanceof Array) {
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
  Add a client resource.

  The data contains a specific structure:

  @param {string} resource
  @param {object} data: Object, having the following structure:
    {string} name: Name of the resource
    {string} path: Path of the resource (relative to the public/ directory)
    {string|array} requires: Dependencies required by the resource
  @private
 */

Application.prototype.addClientResource = function(resource, data) {
  if (! this.client[resource]) this.client[resource] = [];
  this.client[resource].push(data);
}

/**
  Gets a client resource

  @param {string} resource: Client resource
  @param {string} name: Resource name
  @private
 */

Application.prototype.getClientResource = function(resource, name) {
  resource = this.client[resource];
  if (resource) {
    for (var res, i=0; i < resource.length; i++) {
      res = resource[i];
      if (res.name === name) return res;
    }
  }
  return null;
}

/**
  Adds a client script

  @param {object} data
  @private
 */

Application.prototype.addClientScript = function(data) {
  this.addClientResource('scripts', data);
}

/**
  Adds a client stylesheet

  @param {object} data
  @private
 */

Application.prototype.addClientStylesheet = function(data) {
  this.addClientResource('stylesheets', data);
}

/**
  Load application's extensions in lib/[*].js
  
  @param {string} filename to load (accepts multiple) 
  @public
 */
 
Application.prototype.libExtensions = function() {
  var libPath = this.fullPath('lib');
  
  // Exit if lib/ not present
  if (! pathModule.existsSync(libPath)) throw new Error("Unable to find lib/");
  
  var self = this, 
      args = slice.call(arguments, 0);
  
  if (args.length === 0) args = protos.util.ls(libPath, /\.js$/);
  args.forEach(function(lib) {
    self.debug('Loading Extension: lib/' + lib);
    self.require('lib/' + lib);
  });
}

/**
  Builds client resources

  @private
 */

function buildClientResources() {
  // TODO: Compile client resource objects and resolve dependencies, using a topological sorting algorithm
  // TODO: Run this function on the `server_init` event
}

/**
  Helper function, equivalent to url.parse()

  @param {string} url
  @returns {object}
  @private
 */

function parseUrl(url) {
  return urlModule.parse(url);
}

/**
  Enhances the controller function, allowing it to inherit the Controller class. Also allows
  the controller to locally use the static routing functions.

  @param {function} func
  @returns {function}
  @private
 */

function monkeyPatchController(func) {

  var context, newFunc, compile, source,
      funcSrc = func.toString();
  var code = funcSrc
      .trim()
      .replace(/^function\s+(.*?)(\s+)?\{(\s+)?/, '')
      .replace(/(\s+)?\}$/, '');

  // Get source file path
  var alias = protos.lib.controller.prototype.getAlias(func.name),
      srcFile = this.mvcpath + 'controllers/' + alias + '.js';

  try {
    source = fs.readFileSync(srcFile, 'utf-8');
  } catch(e){
    source = fs.readFileSync(srcFile.replace(/\.js$/, '_controller.js'), 'utf-8');
  }

  // Detect pre & post function code
  var si = source.indexOf(funcSrc),
      preFuncSrc = source.slice(0, si).trim(),
      postFuncSrc = source.slice(si + funcSrc.length).trim();

  // Controller code

  var fnCode = "\n\
with (locals) {\n\n\
function "+ func.name +"(app) {\n\
  this.authFilters = this.authFilters['"+ func.name +"'] || [];\n\
  this.prepare.call(this, app);\n\
}\n\n\
require('util').inherits("+ func.name +", protos.lib.controller);\n\n\
protos.extend(" + func.name + ", protos.lib.controller);\n\n\
"+ func.name +".authFilter = "+ func.name +".prototype.authFilter;\n";

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
: protos.lib.controller.prototype.authRequired;\n\n\
return " + func.name + ";\n\n\
}\n";

  // console.exit(fnCode);

  /*jshint evil:true */
  compile = new Function('locals', fnCode);

  newFunc = compile({
    app: this,
    protos: protos,
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
      files = protos.util.getFiles(p),
      mainPos = files.indexOf('base.js'),
      jsExt = protos.regex.jsFile,
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
  
  @private
 */

function createDrivers() {
  var cfg, def, x, y, z,
      config = this.config.database,
      drivers = this.drivers;

  if (Object.keys(config).length === 0) return;

  for (x in config) {
    cfg = config[x];
    if (x == 'default') { def = cfg; continue; }
    for (y in cfg) {
      if (typeof cfg[y] == 'object') {
        if (typeof drivers[x] == 'undefined') drivers[x] = {};
        drivers[x][y] = this._driver(x, cfg[y]);
      } else {
        drivers[x] = this._driver(x, cfg);
        break;
      }
    }
  }

  if (def) drivers.default = this._getResource('drivers/' + def);
  else throw new Error('No default database set. Please check your config/database.');

  if (typeof drivers.default == 'undefined') {
    throw new Error(util.format("No driver available for '%s'.", def));
  }
}

/**
  Creates storages from config
  
  @private
 */

function createStorages() {
  var cfg, x, y, z,
      config = this.config.storage,
      storages = this.storages;

  if (Object.keys(config).length === 0) return;

  for (x in config) {
    cfg = config[x];
    for (y in cfg) {
      if (typeof cfg[y] == 'object') {
        if (typeof storages[x] == 'undefined') storages[x] = {};
        storages[x][y] = this._storage(x, cfg[y]);
      } else {
        storages[x] = this._storage(x, cfg);
        break;
      }
    }
  }
}

/**
  Watches a view Partial for changes
  
  @param {string} path
  @private
 */

function watchPartial(path) {
  
  // Only watch partials on development
  if (this.environment !== 'development') return;
  
  var self = this;
  self.debug('Watching Partial for changes: %s', self.relPath(path, 'app/views'));
  var watcher = fs.watch(path, function(event, filename) {
    if (event == 'change') {
      self.debug("Regeneraging view partial", self.relPath(path));
      self._buildPartialView(path);
    }
    else if (event == 'rename') {
      self.log(util.format("Stopped watching partial '%s' (renamed)", self.relPath(path)));
      watcher.close();
    }
  });
}

module.exports = Application;
