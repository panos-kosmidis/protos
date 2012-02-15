/*jshint immed: false */

/* Controller */

var app;

var _ = require('underscore'),
    _s = require('underscore.string'),
    fs = require('fs'),
    slice = Array.prototype.slice,
    EventEmitter = require('events').EventEmitter;
    
var aliasRegex = {re1: /Controller$/, re2: /^-/};

function Controller() {
  
}


Controller.prototype.authRequired = false;
Controller.prototype.authFilters = {};
Controller.prototype.queuedRoutes = {};
Controller.prototype.httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'TRACE'];
Controller.prototype.routeMethods = [];

/**
  Routing functions, accept the following parameters:
  
  @param {string} route, route to add
  @param {object} arg2, route validation (optional)
  @param {object} arg3, route validation messages (optional, requires arg2)
  @param {function} arg4, callback to run if route is resolved
  @public
 */

var httpMethods = Controller.prototype.httpMethods;

function getRouteArgs(m, args) {
  var regex, methods = [m];
  
  // Note: args is the `arguments` object passed from previous function
  args = slice.call(args, 0);
  
  // Get any additional methods defined for route
  while (typeof args.slice(-1).pop() == 'string') {
    // Array.pop() alters the arguments array (used later on)
    methods.push(args.pop());
  }
  
  // Generate regular expression for the route method(s)
  regex = new RegExp('^('+ methods.join('|').toUpperCase() +')$');
  
  return {args: args, regex: regex};
}

for (var i=0; i < httpMethods.length; i++) {
  (function(m) {
    routeFunction(m,  function(route, arg2, arg3, arg4) {
      // Normal routes use the controller's authRequired value
      
      // Define route metadata array
      var o = getRouteArgs(m, arguments);
      var routeArr = [this, o.regex, this.authRequired, route];
      
      // Override first argument with route metadata array
      o.args[0] = routeArr;
      
      // Run registerRoute function with modified arguments
      registerRoute.apply(null, o.args);
    });
    
    routeFunction('public_' + m,  function(route, arg2, arg3, arg4) {
      // Note: public routes force authRequired=false
      
      // Define route metadata array
      var o = getRouteArgs(m, arguments);
      var routeArr = [this, o.regex, false, route];
      
      // Override first argument with route metadata array
      o.args[0] = routeArr;
      
      // Run registerRoute function with modified arguments
      registerRoute.apply(null, o.args);
    });
  
    routeFunction('private_' + m,  function(route, arg2, arg3, arg4) {
      // private routes force authRequired=true
      
      // Define route metadata array
      var o = getRouteArgs(m, arguments);
      var routeArr = [this, o.regex, true, route];
      
      // Override first argument with route metadata array
      o.args[0] = routeArr;
      
      // Run registerRoute function with modified arguments
      registerRoute.apply(null, o.args);
    });
    
  }).call(this, httpMethods[i].toLowerCase());
}

/**
  Prepares the controller after instantiation
  
  @param {object} app
  @private
 */
 
Controller.prototype.prepare = function(instance) {
  app = instance;
  var args, i, queuedRoutes = this.queuedRoutes[app.domain];
  for (i=0; i < queuedRoutes.length; i++) {
    registerRoute.apply(this, args);
  }
  corejs.util.onlySetEnumerable(this, ['className', 'authRequired']);
}

/**
  Adds a custom authentication filter to the  controller.
  
  This method is intended to be used within controllers. It can also be run
  multiple times, to register multiple filters for the same controller.
  
  Note: The context of this method is the constructor itself, not the instance.
  This methods is passed to the constructor prior to instantiation, which is
  why this method works on the constructor's context.
  
  @param {function} cb
  @static
 */
 
Controller.prototype.authFilter = function(cb) {
  var ctor = this.name,
      authFilters = Controller.prototype.authFilters;

  if (!authFilters[ctor]) authFilters[ctor] = [];
  
  authFilters[ctor].push(cb);
}

/**
  Runs authentication filters for controller
  
  @private
 */

Controller.prototype.runAuthFilters = function(req, res, params, callback) {
  var authFilters = this.authFilters,
      fCount = authFilters.length;

  if (fCount === 0) {
    
    // No filters to run, execute callback directly
    callback.call(this, req, res, params);
    
  } else {
    
    var retVal, filter, 
        self = this, i=-1, 
        promise = new EventEmitter();
    
    // Success event, emitted by filters when authentication is successful
    promise.on('success', function() {
      if (++i == fCount) {
        // No more filters to run
        callback.call(self, req, res, params);
      } else {
        // Run filter
        filter = authFilters[i];
        filter.call(self, req, res, promise);
      }
    });
    
    // Initially emit the `success` event to run first filter
    promise.emit('success');
  }
}

/**
  Retrieves GET parameters with field validation.
  
  The query parameters from the request will be validated against 
  the route's validation rules.
  
  @param {object} req
  @param {string} token (optional)
  @param {function} callback
  @public
 */

Controller.prototype.getQueryData = function(req, callback) {
  var badVal, field, key, msg,
      res = req.response,
      fields = req.__queryData;
      
  if (req.method == 'GET') {
    
    if (app.validate(req, fields, true)) {
      
      // Cleanup fields in req.params
      for (key in fields) {
        if (typeof req.params[key] == 'undefined') {
          delete req.params[key];
        }
      }
      
      callback.call(this, fields);
      
    } else if (req.route.messages != null && req.__invalidParam != null) {
      
      // Validate and provide message if available
      field = req.__invalidParam[0];
      badVal = req.__invalidParam[1];
      
      if ( (msg=req.route.messages[field]) != null ) {
        if (msg instanceof Function) msg = msg(badVal);
        res.rawHttpMessage(400, msg);
      } else {
        app.notFound(res);
      }
    } else {
      app.notFound(res);
    }

  } else {

    app.notFound(res);
    
  }
}

/**
  Returns a controller by its alias
  
  @param {string} name
  @return {object}
  @private
 */

Controller.prototype.getControllerByAlias = function(name) {
  // TODO: ignore /main
  var spos, controller, controllerName;
  name = name.replace(app.regex.startOrEndSlash, '');
  spos = name.indexOf('/');
  if (spos > 0) name = name.slice(0, spos);
  return app.controllers[name];
}

/**
  Gets a controller alias
  
  @param {string} controllerClass (optional)
  @return {string}
  @private
 */

Controller.prototype.getAlias = function(controllerClass) {
  if (!controllerClass) controllerClass = this.constructor.name;
  return (_s.dasherize(controllerClass
  .replace(aliasRegex.re1, ''))
  .replace(aliasRegex.re2, ''));
}

/**
  Gets the associated helper
  
  @returns {object}
  @private
 */
 
Controller.prototype.getHelper = function() {
  var alias = this.getAlias();
  return app.helpers[alias] || null;
}

/**
  Determines which route to use and which callback to call, based on
  the request's method & pathname.
  
  @param {object} urlData
  @param {object} res
  @param {object} req
  @private
 */

Controller.prototype.processRoute = function(urlData, req, res) {
  
  var cb, alias, controller, match, regex, route, routes, url;
  var self = this;
  
  res.__controller = this;
  key = route = regex = match = controller = alias = undefined;
  self = this;
  routes = app.routes[this.constructor.name] || [];
  url = urlData.pathname;
  
  for (var key in routes) {
    route = routes[key];
    
    // Route path matches URL
    // Note: To increase security, we check if the validation routes are empty
    
    if (route.path == url && route.paramKeys.length === 0) { // Route path matches url
      
      if (route.method.test(req.method)) { // If Route method matches request method
        
        req.route = route;
        
        if (app.supports.body_parser && (req.method == 'POST' || req.method == 'PUT') ) { // POST & PUT
          
          if (req.exceededUploadLimit()) return;

          req.parseBodyData(function(fields, files) {

            req.__requestData = {
              fields: fields,
              files: files
            };

            // Preload callback
            req.__handledRoute = true;
            cb = function() {
              if (app.supports.session && route.authRequired) {
                if (req.session.user != null) {
                  route.callback.call(self, req, res, req.params);
                } else {
                  if (req.__requestData.files instanceof app.resources.body_parser.file_manager) {
                    req.__requestData.files.removeAll();
                  }
                  app.login(res);
                }
              } else {
                route.callback.call(self, req, res, req.params);
              }
            }

            // Check if session is enabled, otherwise proceed normally with prepared callback
            if (app.supports.session) app.session.loadSession(req, res, cb);
            else cb.call(this);
          });
          
        } else { // GET & OTHERS
          
          // Preload callback
          req.__handledRoute = true;
          cb = function() {
            if (app.supports.session && route.authRequired) {
              if (req.session.user != null) {
                route.callback.call(self, req, res, req.params);
              } else {
                app.login(res);
              }
            } else {
              route.callback.call(self, req, res, req.params);
            }
          }
          
          // Check if session is enabled, otherwise proceed normally with prepared callback
          if (app.supports.session) app.session.loadSession(req, res, cb);
          else cb.call(this);
        }
        
      } else { // Route method doesn't match request method
      
        app.badRequest(res);
        
      }
      
      return; // Exit function early. Don't delete this line or bad things will happen.
      
    } else if (route.regex.test(urlData.pathname)) { // Matched route with validation
      
      // Populate route params
      if (route.method.test(req.method)) {
        req.route = route;
        if (route.validation != null) {
          match = urlData.pathname.match(route.regex);
          // console.exit(route.regex);
          var i = 1;
          for (key in route.validation) {
            req.params[key] = match[i];
            i++;
          }
        }
        
        // console.exit(req.params);
        
        if (app.supports.body_parser && (req.method == 'POST' || req.method == 'PUT')) { // POST & PUT
          
          if (req.exceededUploadLimit()) return;
          
          req.parseBodyData(function(fields, files) {

            req.__requestData = {
              fields: fields,
              files: files
            };

            // Preload callback
            req.__handledRoute = true;
            cb = function() {
              if (app.supports.session && route.authRequired) {
                if (req.session.user != null) {
                  route.callback.call(self, req, res, req.params);
                } else {
                  req.__requestData.files.removeAll();
                  app.login(res);
                }
              } else {
                route.callback.call(self, req, res, req.params);
              }
            }
            
            // Check if session is enabled, otherwise proceed normally with prepared callback
            if (app.supports.session) app.session.loadSession(req, res, cb);
            else cb.call(this);
            
          });
          
        } else { // GET & OTHERS
          
          // Preload callback
          req.__handledRoute = true;
          cb = function() {
            if (app.supports.session && route.authRequired) {
              if (req.session.user != null) {
                route.callback.call(self, req, res, req.params);
              } else {
                app.login(res);
              }
            } else {
              route.callback.call(self, req, res, req.params);
            }
          }
          
          // Check if session is enabled, otherwise proceed normally with prepared callback
          if (app.supports.session) app.session.loadSession(req, res, cb);
          else cb.call(this);
        }
        
      } else {
        app.badRequest(res);
      }
      
      return; // Exit function early. Don't delete this line or bad things will happen.
      
    }
    
  }
  
  /*
  
  ROUTE PROCESSING ORDER

  '/' and Single Parameter routes:
  
    a) If a controller is found associated with the route (and a route in it matches), render it 
    b) If a route is found in MainController that matches, render it 
    c) If there's a static view that matches the route, render it 
    d) Render 404

  Multiple Parameter routes:
  
    a) If a controller is found associated with the route (and a route in it matches), render it 
    b) If a route is found in MainController that matches, render it 
    c) Render 404
  
  */
  
  var isGet = (req.method == 'GET');
  
  if (this.constructor.name == 'MainController') {
    
    if (req.__isMainRequest) { // If it's a mainRequest
      
      // Try getting a controller for the route
      alias = url.replace(app.regex.startOrEndSlash, '');
      controller = alias !== 'main' ? this.getControllerByAlias(alias) : null;
      
      if (controller != null && routes != null) {
        // Controller found, process its routes
        controller.processRoute.call(controller, urlData, req, res);
      } else {
        
        if (isGet) { // If it's a GET request

          if (app.staticViewExists(url) ) {
            // Render a static view if found for such url
            renderStaticView.call(this, url, req, res);
          } else if (app.supports.static_server) {
            // Serve any static files matching URL (sends  404 response if not found)
            app.serveStaticFile(app.path + '/' + app.paths.public + url, req, res);
          } else {
            // Nothing found
            app.notFound(res);
          }
          
        } else {
          
          // Nothing found
          app.notFound(res);
          
        }
        
      }
      
    } else if (isGet) { // Not a mainRequest. See if it's a GET request
      
      if (app.staticViewExists(url)) {
        // Render a static view if found for such url
        renderStaticView.call(this, url, req, res);
      } else if (app.supports.static_server) {
        // Serve any static files matching URL (sends  404 response if not found)
        app.serveStaticFile(app.path + "/" + app.paths.public + url, req, res);
      } else {
        // Nothing found
        app.notFound(res);
      }
      
    } else {
      
      // Nothing found
      app.notFound(res);
      
    }

  } else if (isGet) {
    
    if (app.staticViewExists(url)) {
      // Render a static view if found for such url
      renderStaticView.call(this, url, req, res);
    } else if (app.supports.static_server) {
      // Serve any static files matching URL (sends 404 response if not found)
      app.serveStaticFile(app.path + "/" + app.paths.public + url, req, res);
    } else {
      // Nothing found
      app.notFound(res);
    }
    
  } else { // It's not a get request, as a last resource, try locating the route on MainController
    
    app.controller.processRoute.call(app.controller, urlData, req, res);
    
  }
}

/**
  Determines which controller to use for a request URL
  
  @param {object} urlData
  @param {object} req
  @param {object} res
  @private
 */
  
Controller.prototype.exec = function(urlData, req, res) {
  var controller,
      url = urlData.pathname,
      matches = url.match(app.regex.controllerAlias);
  
  if (matches) controller = app.controller.getControllerByAlias(matches[1]);
  controller = (controller || app.controller);
  controller.processRoute.call(controller, urlData, req, res);
}

/**
  Renders a static view
  
  @param {string} url
  @param {object} req
  @param {object} res
  @private
 */

function renderStaticView(url, req, res) {
  var template;
  url = url.replace(app.regex.endsWithSlash, '');
  app.emit('static_view', req, res, url);
  if (req.__stopRoute === true) return;
  var cb = function() {
    template = app.views.staticAsoc[url];
    if (typeof template == 'string') {
      res.render('/' + template);
    } else {
      app.serverError(res, [new Error('Unable to load template for ' + url)]);
    }
  }
  if (app.supports.session) {
    app.session.loadSession(req, res, cb);
  } else {
    cb.call(this);
  }

}


/**
  Route registration function, used both in Static & Prototype methods
  
  @params {mixed} specified in the `Routing Functions` section on this file
  @private
 */

function registerRoute(route, arg2, arg3, arg4) {
  
  /*
    Route registration happens in 2 iterations:

    1) The routes are added in the Application's controller (routes are queued) 
    2) On instantiation, the routes are registered
  */
  
  var app = corejs.app,
      getAlias = Controller.prototype.getAlias;
  
  var controller = route[0],
    caller = controller.name,
    method = route[1],
    authRequired = route[2];
    
  route = route[3];
  
  var validation, messages, callback, regex;
  
  if (arg3 === undefined && typeof arg2 == 'function') {
    validation = null; messages = null; callback = arg2;
  } else if (arg4 === undefined && typeof arg2 == 'object' && typeof arg3 == 'function') {
    messages = null; validation = arg2; callback = arg3;
  } else if (typeof arg2 == 'object' && typeof arg3 == 'object' && typeof arg4 == 'function') {
    validation = arg2; messages = arg3; callback = arg4;
  } else {
    throw new Error("[" + app.domain + "] Unable to process route on " + caller + ": " + route);
  }

  if ( !app.regex.startsWithSlash.test(route) ) route = "/" + route;
  if (caller !== 'MainController') {
    route = "/" + getAlias(caller) + route;
  }
  if (app.routes[caller] == null) app.routes[caller] = [];
  if (route !== '/') route = route.replace(app.regex.endsWithSlash, '');

  try {
    if (validation == null) {
      // allow an optional slash at the end
      regex = new RegExp('^' + route.replace(app.regex.regExpChars, '\\$1') + '\\/?$');
    } else {
      regex = route.replace(app.regex.regExpChars, '\\$1');
      for (var key in validation) {
        if (typeof validation[key] == 'string') {
          if (validation[key] in app.regex) {
            validation[key] = app.regex[validation[key]];
          } else {
            throw new Error('Invalid Regular Expression alias: ' + validation[key]);
          }
        }
        regex = regex.replace(new RegExp(':' + key, 'g'), '(' 
        + validation[key]
        .toString()
        .replace(app.regex.startOrEndSlash, '')
        .replace(app.regex.startOrEndRegex, '') + ')');
      }
      regex = regex.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
      regex = new RegExp('^' + regex + '\\/?$');
    }
  } catch (e) {
    throw new Error("[" + app.domain + "] " + caller + ' ' + route + ': ' + e);
  }

  var paramKeys = ( validation ) ? Object.keys(validation) : [];

  app.routes[caller].push({
    path: route,
    method: method,
    regex: regex,
    validation: validation || {},
    paramKeys: paramKeys,
    messages: messages,
    authRequired: authRequired,
    callback: function(req, res, params) {
      this.runAuthFilters(req, res, params, callback);
    },
    caller: caller
  });
  
}

/**
  Automates the addition of routing functions
 */

function routeFunction() {
  var args = slice.call(arguments, 0),
      func = args.pop();
  for (var alias,i=0; i < args.length; i++) {
    alias = args[i];
    Controller.prototype.routeMethods.push(alias);
    Controller[alias] = func;
  }
}

module.exports = Controller;
