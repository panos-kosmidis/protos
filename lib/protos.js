
/**
  Protos
  
  Configures the protos, and is in charge of assembling all the applications together. 
  Provides the master server that handles and routes all of the virtual host requests.

  Available globally as protos.
 */
 
require('./extensions.js');

var _ = require('underscore'),
    events = require('events'),
    net = require('net'),
    inflect = require('./support/inflect.js'),
    child_process = require('child_process'),
    cluster = require('cluster'),
    os = require('os'),
    http = require('http'),
    util = require('util'),
    pathModule = require('path'),
    EventEmitter = events.EventEmitter;

function Protos(noserver) {
  
  var self = this;
  
  // Initialize `protos` global
  global.protos = this;

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

  // Internals
  this.drivers = {};
  this.engines = {};
  this.storages = {};
  this.lib = {};

  // Regular expressions
  this.regex = require('./regex');
  
  // Expose inflection
  this.inflect = inflect;

  // Instance properties
  this.apps = {};
  this.vhosts = {};
  this.path = pathModule.resolve(__dirname, '../');
  this.className = this.constructor.name;
  
  // Setup read-only environment
  Object.defineProperty(this, 'environment', {
    value: this.config.environment,
    writable: false,
    enumerable: true,
    configurable: false
  });
  
  // Server options, provided by environment
  this.serverOptions = null;

  // Preload Utility
  var Utility = require('./utility'),
      skipFromLibDir = ['request.js', 'response.js', 'protos.js', 'command.js', 'client'];
      
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
  
  // Allow using protos standalone
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

// Version
Protos.version = require('../package.json').version;

// Stores the configuration settings for the protos
Protos.config = {
  autoCurl: true
};

// Save the Framework's MasterPath, for future reference
Protos.path = pathModule.resolve(__dirname, '../');

// Inherit from EventEmitter
Protos.__proto__ = new EventEmitter();

/**
  Developers Note: the static properties of the Protos constructor are passed
  to the protos instance on construction. This means, the methods and properties
  available in the Protos constructor will also be available in the instance.
 */

/**
  Bootstraps an application
  
  @param {string} dir
  @param {object} config
  @static
 */
 
Protos.bootstrap = function(dir, config) {
  
  if (process.env.FAUX === '1') {
    console.log(JSON.stringify(config));
    process.exit();
  }

  if (typeof config == 'undefined') {
    throw new Error('Configuration parameter missing');
  }
  
  ['server', 'environments', 'events'].forEach(function(section) {
    if (!config[section]) config[section] = {};
  });
  
  var appEnv, envFunc, vhosts = {};

  // Get environment
  appEnv = process.env.NODE_ENV || config.environments.default || 'development';

  // Configure vhosts
  Protos.configure('bootstrap', config);
  
  // Ability to alter the bootstrap
  Protos.emit('bootstrap_config', config);
  
  Protos.configure('environment', appEnv);
  Protos.configure('hostname', config.server.host || 'localhost');
  Protos.configure('appPath', dir);


  // Stay up setting
  if (typeof config.server.stayUp == 'undefined') {
    var stayUp = false;
  } else {
    switch (config.server.stayUp.constructor.name || false) {
      case 'Boolean':
        stayUp = config.server.stayUp;
        break;
      case 'String':
        stayUp = (appEnv === config.server.stayUp);
        break;
      case 'Array':
        stayUp = (config.server.stayUp.indexOf(appEnv) >= 0)
        break;
      default: break;
    }
  }
  
  // console.log(stayUp);

  // Configure server
  Protos.configure('server', {
    listenPort: process.env.PORT_OVERRIDE || config.server.port || 8080,
    multiProcess: config.server.multiProcess || false,
    stayUp: stayUp
  });
  
  var events = config.events || {};

  Protos.once('pre_init', function(app) {

    // Setup 'environment' getter
    Object.defineProperty(app, 'environment', {
      value: protos.environment,
      writable: false,
      enumerable: false,
      configurable: false
    });
    
    // Run environment script
    var envFunc, envPath = 'config/env/' + appEnv + '.js';
    
    if (pathModule.existsSync(app.fullPath(envPath))) {
      envFunc = app.require(envPath);
      if (envFunc instanceof Function) envFunc(app);
    }
    
    // Run environment function from bootstrap
    var bootEnvFunc = config.environments[appEnv];
    if (bootEnvFunc instanceof Function) bootEnvFunc(app);

    // Run bootstrap pre_init event (already on pre_init)
    if (events.pre_init instanceof Function) {
      events.pre_init.call(null, app);
      delete events.pre_init;
    }
    
    // Attach bootstrap events
    for (var evt in events) {
      app.on(evt, events[evt]);
    }
    
  });
  
  // Protos singleton
  return new Protos();

}

/**
  Configures the protos.
  
  @param {string} context 
  @param {string|object} value
  @returns {self} for chaining
  @static
 */

Protos.configure = function(context, value) {
  Object.defineProperty(this.config, context, {
    value: value,
    writable: false,
    enumerable: true,
    configurable: false
  });
  return this;
}

/**
  Requires a module relative to the protos's path
  
  @param {string} module
  @param {boolean} reload
  @returns {object}
  @public
 */

Protos.prototype.require = function(module, reload) {
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
  Enables the debugger
  
  @public
 */
 
Protos.prototype.enableDebugger = function() {
  console.log('');
  require('child_process').spawn('kill', ['-s', 'SIGUSR1', process.pid]);
}

/**
  Notifies the application that an asynchronous event has been triggered
 */

Protos.prototype.async = function(app) {
  app.asyncQueue.push(1);
}

/**
  Notifies the application that an asynchronous event has finalized
  
 */

Protos.prototype.done = function(app) {
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
  Deep extend, up to one level
  
  @param {object} source
  @param {object} destination
  @return {object}
 */
 
Protos.prototype.configExtend = function(base, source) {
  // Extend the base, 1 level deep
  for (var key in base) {
    if (key in source) {
      if (source[key] instanceof Array) {
        base[key] = source[key];
      } else if (source[key] instanceof Object) {
        protos.extend(base[key], source[key]);
      } else {
        base[key] = source[key];
      }
    }
  }
  return base;
}

/**
  Shortcut for util.inherits
  
  @param {function} base
  @param {function} parent
  @public
 */

Protos.prototype.inherits = function(base, parent) {
  util.inherits(base, this.lib[parent]);
}

/**
  Initializes applications, and configures virtual hosts
  
  @param {object} servers
  @private
 */

Protos.prototype.launchApplication = function(servers) {
  var enumerable = ['className', 'domain', 'path', 'debugLog', 'viewCaching',
      'storage', 'lib','models', 'helpers', 'controllers', 'engines', 'initialized'];
  
  var host = this.config.hostname,
      path = pathModule.resolve(this.path, this.config.appPath);

  // Enable inheritance within Application
  var Application = protos.lib.application;
  
  // Initialize app routes
  this.lib.controller.prototype.queuedRoutes[host] = [];

  // Provide new app prototype
  var app = new Application(host, path);
  
  // Only set important properties enumerable
  this.util.onlySetEnumerable(app, enumerable);

  // Start the server
  this.startServer();
}

/**
  Starts the application server
  
  @private
 */

Protos.prototype.startServer = function() {
  
  /*jshint loopfunc:true */
  
  var app = this.app,
      interProcess = this,
      options = this.config.server,
      allCPUS = os.cpus().length,
      bootstrap = protos.config.bootstrap;
  
  // Merge config with this.clusterConfig
  options = this.serverOptions = _.extend(this.clusterConfig, options);
    
  if (typeof options.multiProcess == 'number') {
    allCPUS = (options.multiProcess || 1);
    options.multiProcess = true;
    options.allCPUS = allCPUS;
  } else if (typeof options.multiProcess == 'boolean') {
    options.allCPUS = allCPUS;
  } else {
    throw new Error("The multiProcess option accepts {int|boolean}. Check your boot.js file");
  }
  
  // Convenience function, to avoid repetition
  function commonStartupOperations() {
    if (options.stayUp) {
      process.on('uncaughtException', app.log); // prints stack trace
    }
    
    // console.log(process.pid);
    
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
    
    // app.server already available on `pre_init` event
    
    // Worker
    app.server.listen(options.listenPort, app.domain, function() {
      // Server init event
      app.emit('server_init', app.server);
    });
    
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

Protos.prototype.checkInspectorStatus = function() {
  var port = 3000;
  this.util.checkPort(port, function(err) {
    if (err) {
      console.log('Node Inspector is not running.\n\nStart it with `protos inspector start`\n');
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
  var app = this.app;
  if ((process.argv.length >= 3 && !options.multiProcess) || process.env.NODE_ENV == 'silent') {
    return; // Disable startup message on curl requests
  }
  app.log(util.format('%s Server running on %s', inflect.capitalize(protos.environment), app.baseUrl));
  if (options.multiProcess) app.log(util.format('Running a cluster of %d workers', options.allCPUS));
  app.emit('startup_message');
}

/**
  Handles automatic curl requests on environments, by passing its command line options for a new request.
  
  If a relative path is used, the default application's (the first you have defined on the environment) url
  will be used, and the path attached to it.
  
  An URL can also be used.
  
  @private
 */

function autoCurlRequest() {
  if (process.argv.length >= 3 && protos.config.autoCurl) {
    var app = protos.app, 
        config = protos.config,
        args = process.argv.slice(2),
        url = args[args.length - 1],
        exec = require('child_process').exec,
        portStr = config.server.listenPort !== 80 ? ":" + config.server.listenPort : '';
    
    if (protos.regex.startsWithSlash.test(url)) {
      url = "http://" + app.domain + portStr + url;
    }
    
    var switches = args.slice(0, (args.length - 1)).join(' ');
    var cmd = switches + ' ' + url;
    
    var cb = function() {
      app.curl(cmd, function(err, buf) {
        console.log(err || buf);
        process.exit(0);
      });
    }
    
    // Run request when needed
    if (app.initialized) cb();
    else app.on('init', cb);
    
  }
}
  
module.exports = Protos;
