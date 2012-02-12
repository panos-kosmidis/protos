
/**
  CoreJS
  
  Configures the corejs, and is in charge of assembling all the applications together. 
  Provides the master server that handles and routes all of the virtual host requests.

  Available globally as corejs.
 */
 
require('./extensions.js');

var _ = require('underscore'),
    events = require('events'),
    net = require('net'),
    child_process = require('child_process'),
    cluster = require('cluster'),
    os = require('os'),
    http = require('http'),
    util = require('util'),
    pathModule = require('path'),
    EventEmitter = events.EventEmitter;

function CoreJS(noserver) {
  
  var self = this;
  
  // Initialize `corejs` global
  global.corejs = this;

  // Inherit from constructor
  _.extend(this, this.constructor);

  // Cluster configuration
  this.clusterConfig = {
    listenPort: null,
    multiProcess: 0,
    masterProcess: 'node [master]',
    singleProcess: 'node [single process]',
    workerProcess: 'node worker'
  };

  this.extend = _.extend;
  
  this.Multi = require('multi');

  // Internals
  this.drivers = {};
  this.engines = {};
  this.storages = {};
  this.lib = {};

  // Regular expressions
  this.regex = require('./regex');

  // Instance properties
  this.apps = {};
  this.vhosts = {};
  this.path = pathModule.resolve(__dirname, '../');
  this.className = this.constructor.name;
  this.environment = this.config.environment || 'GENERIC';

  // Server options, provided by environment
  this.serverOptions = null;

  // Preload Utility
  var Utility = require('./utility'),
      skipFromLibDir = ['request.js', 'response.js', 'corejs.js'];
      
  this.util = new Utility();
  
  // Lib
  this.util.getFiles(this.path + '/lib', function(file) {
    var key = file.replace(self.regex.jsFile, '');
    if (skipFromLibDir.indexOf(file) >= 0) return;
    self.lib[key] = require(self.path + '/lib/' + file);
  });

  // Storage
  this.util.getFiles(this.path + '/storages/' , function(file) {
    var key = file.replace(self.regex.jsFile, '');
    self.storages[key] = require(self.path + '/storages/' + file);
  });
  
  // Database drivers
  this.util.getFiles(this.path + '/drivers', function(file) {
    var key = file.replace(self.regex.jsFile, '');
    self.drivers[key] = require(self.path + '/drivers/' + file);
  });

  // Template engine prototype
  this.engineProto = new this.lib.engine();
  
  // Template Engines
  this.util.getFiles(this.path + '/engines', function(file) {
    var key = file.replace(self.regex.jsFile, '');
    self.engines[key] = require(self.path + '/engines/' + file);
  });
  
  // Enhance request/response
  require('./response');
  require('./request');
  
  // Allow using corejs standalone
  if (noserver) return;

  // Start the debugger if on DEBUG environment
  if (this.config.environment == 'debug') this.checkInspectorStatus();
  
  // Launch application server
  this.launchApplication();
  
  // Only set important properties enumerable
  this.util.onlySetEnumerable(this, ['version', 'className', 'environment', 'path', 'config', 'vhosts', 'apps',
    'drivers', 'engines', 'storages']);
  
  // console.exit(this);
}

// Stores the configuration settings for the corejs
CoreJS.config = {
  autoCurl: true
};

// Save the Framework's MasterPath, for future reference
CoreJS.path = pathModule.resolve(__dirname, '../');

// Inherit from EventEmitter
CoreJS.__proto__ = new EventEmitter();

/**
  Developers Note: the static properties of the CoreJS constructor are passed
  to the corejs instance on construction. This means, the methods and properties
  available in the CoreJS constructor will also be available in the instance.
 */

/**
  Bootstraps an application
  
  @param {string} dir
  @param {object} config
  @static
 */
 
CoreJS.bootstrap = function(dir, config) {

  if (typeof config == 'undefined') {
    throw new Error('Configuration parameter missing');
  }

  var appEnv, envFunc, vhosts = {};

  // Run application as standalone (from command line)
  appEnv = process.env.NODE_ENV || config.environment || 'development';

  // Start node debugger, if on `debug` environment
  if (appEnv == 'debug') {
    console.log('');
    require('child_process').spawn('kill', ['-s', 'SIGUSR1', process.pid]);
    CoreJS.configure('inspector_port', config.inspector_port || 3000);
  }

  // Configure vhosts
  CoreJS.configure('bootstrap', config);
  CoreJS.configure('environment', appEnv);
  CoreJS.configure('hostname', config.host || 'localhost');
  CoreJS.configure('appPath', dir);

  // Configure server
  CoreJS.configure('server', {
    listenPort: config.port || 8080,
    multiProcess: config.multiProcess || false,
    stayUp: config.stayUp || false,
  });
  
  var events = config.events || {};

  CoreJS.once('pre_init', function(app) {
    
    // Run environment script
    var envFunc = app.require('config/env/' + appEnv);
    envFunc(app);
    
    // Run bootstrap pre_init event (already on pre_init)
    if (events.pre_init instanceof Function) {
      events.pre_init.call(app);
      delete events.pre_init;
    }
    
    // Run bootstrap events
    for (var evt in events) {
      app.on(evt, events[evt]);
    }
    
    // Setup bootstrap redirection
    if (config.redirect && typeof config.redirect == 'string') {
      app.on('request', function(req, res) {
        req.stopRoute();
        if (req.method == 'GET') {
          res.setHeaders({'Connection': 'close'}); // Make sure connection is closed
          res.redirect(config.redirect);
        } else res.rawHttpMessage({statusCode: 400, raw: true});
      });
    }
  });
  
  // Framework singleton
  return new CoreJS();

}

/**
  Configures the corejs.
  
  @param {string} context 
  @param {string|object} value
  @returns {self} for chaining
  @static
 */

CoreJS.configure = function(context, value) {
  this.config[context] = value;
  return this;
}

/**
  Requires a module relative to the corejs's path
  
  @param {string} module
  @param {boolean} reload
  @returns {object}
  @public
 */

CoreJS.prototype.require = function(module, reload) {
  var Module, oldCache, outModule,
      modulePath = '../' + module;
  
  if (reload) {
    // Get node's Module
    Module = require('module').Module;
    
    // Backup original cache
    oldCache = Module._cache;
    
    // Temporarily empty cache         
    Module._cache = {};
    
    // Get the reloaded module
    try { outModule = require(modulePath); }
    catch(e) { outModule = require(module); }
    
    // Restore the module cache
    Module._cache = oldCache;  
    
    return outModule;
  } else {
    try { return require(modulePath); }
    catch(e) { return require(module); }
  }
}

/**
  Notifies the application that an asynchronous event has been triggered
 */

CoreJS.prototype.async = function(app) {
  app.asyncQueue.push(1);
} 

/**
  Notifies the application that an asynchronous event has finalized
  
 */

CoreJS.prototype.done = function(app) {
  app.asyncQueue.pop();
  if (app.asyncQueue.length === 0) {
    // Application is initialized on the next tick of event loop,
    // To prevent access errors on objects
    process.nextTick(function() {
      app.initialize();
    });
  }
}

/**
  Shortcut for util.inherits
  
  @param {function} base
  @param {function} parent
  @public
 */

CoreJS.prototype.inherits = function(base, parent) {
  util.inherits(base, this.lib[parent]);
}

/**
  Initializes applications, and configures virtual hosts
  
  @param {object} servers
  @private
 */

CoreJS.prototype.launchApplication = function(servers) {
  var Application, app, appInit, data, host, initFunction, path, controllerProto;
  var enumerable = ['className', 'domain', 'path', 'debugMode', 'viewCaching',
      'storage', 'lib','models', 'helpers', 'controllers', 'engines', 'initialized'];
  
  host = this.config.hostname;
  path = pathModule.resolve(this.path, this.config.appPath);

  // Enable inheritance within Application
  Application = require(path + '/app');

  // Initialize app routes
  this.lib.controller.prototype.queuedRoutes[host] = [];

  // Provide new app prototype
  app = new this.lib.application(host, path);
  app._super = app;
  
  // Construct new app
  _.extend(app, new Application(host, path));

  // Only set important properties enumerable
  this.util.onlySetEnumerable(app, enumerable);

  // Start the server
  this.startServer();
}

/**
  Starts the application server
  
  @private
 */

CoreJS.prototype.startServer = function() {
  
  /*jshint loopfunc:true */
  
  var app = this.app,
      interProcess = this,
      options = this.config.server,
      allCPUS = os.cpus(),
      bootstrap = corejs.config.bootstrap;
  
  // Merge config with this.clusterConfig
  options = this.serverOptions = _.extend(this.clusterConfig, options);
    
  if (typeof options.multiProcess == 'number') {
    allCPUS = (options.multiProcess || 1);
    options.multiProcess = true;
    options.allCPUS = allCPUS;
  } else allCPUS = os.cpus().length;
  
  // Convenience function, to avoid repetition
  function commonStartupOperations() {
    if (options.stayUp) {
      process.on('uncaughtException', app.log); // prints stack trace
    }
    startupMessage.call(this, options);
  }
  
  if (options.multiProcess && cluster.isMaster) {
    
    // Master
    
    process.title = options.masterProcess;
    
    for (var worker, i=0; i < allCPUS; i++) {
      worker = cluster.fork();
      worker.on('message', function(data) {
        if (data.cmd != null) interProcess.emit('worker_message', data);
        if (data.response != null) worker.send({response: data.response});
      });
    }
    
    cluster.on('death', function(worker) {
      app.log('Worker process ' + worker.pid + ' died. Restarting...');
      cluster.fork();
    });
    
    commonStartupOperations.call(this);
    app.log('Master running...');
    
  } else {
    
    // Worker
    
    app.server = http.createServer(function(req, res) {
      app.routeRequest(req, res); // Needs to run in the app's context
    });
    
    app.server.listen(options.listenPort, app.domain);
    
    if (options.multiProcess) {
      process.title = options.workerProcess;
      app.log('Worker running...');
    } else {
      process.title = options.singleProcess;
      commonStartupOperations.call(this);
      autoCurlRequest();
    }
    
  }
}

/**
  Checks the status of the node inspector
  
  @private
 */

CoreJS.prototype.checkInspectorStatus = function() {
  var port = this.config.inspector_port || 3000;
  
  this.util.checkPort(port, function(err) {
    if (err) {
      console.log('Node Inspector is not running.\n\nStart it with `./tools/run-inspector`\n');
      process.exit();
    } else {
      console.log('Node Inspector running on http://0.0.0.0:' + port);
    }
  });
  
}
  
  
/**
  Prints the startup message
  
  @param {object} options
  @private
 */

function startupMessage(options) {
  var app = this.app,
      redirect = corejs.config.bootstrap.redirect;
  if (process.argv.length >= 3 && !options.multiProcess) return; // Disable startup message on curl requests
  app.log(util.format('Server running on %s', app.baseUrl));
  if (options.multiProcess) app.log(util.format('Running a cluster of %d workers', options.allCPUS));
  if (redirect && typeof redirect == 'string') app.log('Redirecting GET requests to ' + redirect);
}

/**
  Handles automatic curl requests on environments, by passing its command line options for a new request.
  
  If a relative path is used, the default application's (the first you have defined on the environment) url
  will be used, and the path attached to it.
  
  An URL can also be used.
  
  @private
 */

function autoCurlRequest() {
  if (process.argv.length >= 3 && corejs.config.autoCurl) {
    var app = corejs.app, 
        config = corejs.config,
        args = process.argv.slice(2),
        url = args[args.length - 1],
        exec = require('child_process').exec,
        portStr = config.server.listenPort !== 80 ? ":" + config.server.listenPort : '';
    
    if (corejs.regex.startsWithSlash.test(url)) {
      url = "http://" + app.domain + portStr + url;
    }
    
    var switches = args.slice(0, (args.length - 1)).join(' ');
    var cmd = switches + ' ' + url;
    
    app.on('init', function() {
      app.curl(cmd, function(err, buf) {
        console.log(err || buf);
        process.exit(0);
      });
    });
    
  }
}
  
module.exports = CoreJS;
