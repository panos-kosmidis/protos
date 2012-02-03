
/* http.OutgoingMessage */

var _ = require('underscore'),
    http = require('http'),
    OutgoingMessage = http.OutgoingMessage,
    pathModule = require('path'),
    util = require('util'),
    fs = require('fs'),
    searchPattern = framework.util.searchPattern;

/**
  Renders the specified view
  
  @param {string} view
  @param {object} data
  @param {boolean} raw
  @public
 */

OutgoingMessage.prototype.render = function(view, data, raw) {
  
  var self = this,
      app = this.__app;
      
  // Check if response cache is enabled, then get response cache resource
  var cacheStore = (app.supports.response_cache && app.resources.response_cache);
      
  if (cacheStore != null && this.cacheID != null) {
    cacheStore.get("response_cache_" + this.cacheID, function(err, response) {
      if (err) {
        return app.serverError(self, err);
      } else if (response == null) {
        self.__doResponseCache = true;
        asyncRender.call(self, view, data, raw);
      } else {
        self.__runtimeData = {
          viewCounter: 0,
          views: [],
          buffer: response
        };
        app.debug("Using cached response for " + self.cacheID);
        renderViewBuffer.call(self);
      }
    });
  } else {
    asyncRender.call(self, view, data, raw);
  }
}

/**
  Gets the view path

  VIEW RENDERING LOGIC

  Using a view alias or filename:

    res.render('index'); -> will render 'main/main-index.{extension}'
    res.render('hello-there.{extension}) -> will render 'main/hello-there.{extension}'
  
  Using a path relative to the views/ directory:

    res.render('main/index') -> will render 'main/main-index.{extension}'
    res.render('/main/index') -> will render 'main/main-index.{extension}'
    res.render('main/index.{extension}) -> will render 'main/index.{extension}'
    res.render('/hello') -> will render /hello.{extension} (relative to views/)
    res.render('/hello.{extension}') -> will render /hello.{extension} (relative to views/)

  @param {string} view
  @returns {string}
  @private
 */

OutgoingMessage.prototype.getViewPath = function(view) {
  var alias, app, controller, depth, dirname, file, path;
  app = this.__app;
  controller = this.__controller || app.controller;
  dirname = pathModule.dirname(view);
  
  if (app.regex.layoutView.test(view)) {
    view = view.replace(app.regex.layoutView, '');
    path = app.mvcpath + "views/" + app.paths.layout + view;
  } else if (app.regex.restrictedView.test(view)) {
    view = view.replace(app.regex.restrictedView, '');
    path = app.mvcpath + "views/" + app.paths.restricted + view;
  } else if (!app.regex.startsWithSlash.test(view) && dirname == '.') {
    alias = controller.getAlias();
    if (app.regex.templateFile.test(view)) {
      path = app.mvcpath + "views/" + alias + "/" + view;
    } else {
      path = app.mvcpath + "views/" + alias + "/" + alias + "-" + view;
    }
  } else {
    view = view.replace(app.regex.startsWithSlash, '');
    dirname = pathModule.dirname(view);
    if (dirname == '.') {
      path = app.mvcpath + "views/" + app.paths.static + view;
    } else {
      depth = (searchPattern(view, '/'))['/'].length;
      if (depth == 1) {
        view = view.split('/');
        path = (app.regex.templateFile.test(view[1]) 
        ? app.mvcpath + "views/" + view[0] + "/" + view[1] 
        : app.mvcpath + "views/" + view[0] + "/" + view[0] + "-" + view[1]);
      } else {
        path = app.mvcpath + "views/" + view;
      }
    }
  }
  
  if (! app.regex.templateFile.test(path)) {
    path = app.views.pathAsoc[app.relPath(path)]
  }
  
  return path;
  
}

/**
  Enables caching for the response. Will store the response buffer on the Redis CacheStore.
  
  Any subsequent requests will use the cached response instead of the default response.
  
  @param {string} cacheID
  @public
 */

OutgoingMessage.prototype.useCache = function(cacheID) {
  if (this.__app.supports.response_cache) this.cacheID = cacheID;
}

/**
  Renders a raw HTTP Message
  
  @param {int} statusCode
  @param {string} message
  @param {array} logData
  @public
 */

OutgoingMessage.prototype.rawHttpMessage = function(statusCode, message, logData) {
  var buffer, raw, ob, app = this.__app;
  
  if (typeof statusCode == 'object') {
    ob = statusCode;
    statusCode = ob.statusCode;
    message = ob.message;
    raw = ob.raw || this.app.rawViews;
    logData = ob.logData;
    if (statusCode != null) this.statusCode = statusCode;
  } else {
    if (logData == null && message == null && typeof statusCode == 'string') {
      message = statusCode;
      statusCode = 200;
    }
    this.statusCode = statusCode;
  }
  
  buffer = (message != null 
  ? message
  : this.statusCode + " " + http.STATUS_CODES[this.statusCode] + "\n");
  
  if (raw || this.__request.__isAjax === true) {
    this.setHeaders({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/plain'
    });
    this.sendHeaders();
    this.end(buffer, app.config.encoding);
  } else {
    this.render('#msg', {
      message: buffer.trim()
    }, app.config.rawViews);
  }
  
  if (logData) app.log(logData);
}

/**
  Redirects to a specific location
  
  @param {string} location
  @public
 */

OutgoingMessage.prototype.redirect = function(location) {
  var self = this,
      req = this.__request;
    
  var sessionChanged = ( req.sessionChanged instanceof Function && req.sessionChanged() );
    
  if ( sessionChanged ) {
    req.saveSessionState(function() {
      redirect.call(self, location);
    });
  } else {
    redirect.call(this, location);
  }
}

/**
  Sets a cookie
  
  @param {string} name
  @param {string} value
  @param {object} opts
  @public
 */

OutgoingMessage.prototype.setCookie = function(name, val, opts) {
  var pairs, removeCookie,
      app = this.__app,
      request = this.__request;
  
  app.loadCookies(request);
      
  if (opts == null) opts = {};
  pairs = [name + "=" + (encodeURIComponent(val))];
  removeCookie = framework.util.isTypeOf(opts.expires, 'number') && opts.expires < 0;
  if (opts.domain == null) opts.domain = app.domain;
  if (opts.domain == 'localhost') opts.domain = null;
  if (opts.path == null) opts.path = '/';
  
  opts.expires = (framework.util.isTypeOf(opts.expires, 'number') 
  ? new Date(Date.now() + (opts.expires*1000)) 
  : null);
  
  if (opts.domain != null) pairs.push("domain=" + opts.domain);
  pairs.push("path=" + opts.path);
  if (opts.expires != null) pairs.push("expires=" + (opts.expires.toUTCString()));
  if (opts.httpOnly != null) pairs.push('httpOnly');
  if (opts.secure != null) pairs.push('secure');
  if (!removeCookie) request.__cookies[name.toLowerCase()] = val;
  
  return this.__setCookie.push(pairs.join('; '));
}

/**
  Removes a cookie
  
  @param {string} cookie
  @public
 */

OutgoingMessage.prototype.removeCookie = function(name) {
  if (this.__request.__cookies == null) this.__app.loadCookies(this.__request);
  this.setCookie(name, null, {expires: -3600});
  delete this.__request.__cookies[name.toLowerCase()];
}

/**
  Removes several cookies
  
  @param {array} cookies
  @public
 */

OutgoingMessage.prototype.removeCookies = function(names) {
  for (var i=0; i< names.length; i++) {
    this.removeCookie(names[i]);
  }
}

/**
  Checks if cookie exists
  
  @param {string} cookie
  @return {boolean}
  @public
 */

OutgoingMessage.prototype.hasCookie = function(cookie) {
  return this.__request.hasCookie(cookie);
}

/**
  Gets a cookie value
  
  @param {string} cookie
  @returns {string}
  @public
 */

OutgoingMessage.prototype.getCookie = function(cookie) {
  return this.__request.getCookie(cookie);
}

/**
  Sets response headers
  
  @param {object} headers
  @public
 */

OutgoingMessage.prototype.setHeaders = function(headers) {
  if (this._header != null) return;
  return this.__headers = _.extend(this.__headers, headers);
}

/**
  Evaluates the dynamic headers
  
  @public
 */
  
OutgoingMessage.prototype.headerFilter = function() {
  if (this._header != null) return;
  var action, field;
  for (field in this.__headers) {
    action = this.__headers[field];
    if (typeof action == 'string') {
      this.__headers[field] = action;
    } else if (typeof action == 'function') {
      this.__headers[field] = action.call(this.__app, this.__request, this);
    } else {
      continue;
    }
  }
}

/**
  Sends the HTTP Headers
  
  @public
 */

OutgoingMessage.prototype.sendHeaders = function() {
  if (this._header != null) return;
  this.headerFilter();
  if (this.__setCookie.length) this.setHeader('Set-Cookie', this.__setCookie);
  for (var key in this.__headers) {
    this.setHeader(key, this.__headers[key]);
  }
  this.writeHead(this.statusCode);
}


/* Private functions */


/**
  Reusable function that handles asynchronous rendering of templates
  
  @param {string} view
  @param {object} data
  @param {boolean} raw
  @private
 */

function asyncRender(view, data, raw) {
  /*jshint proto:true */
  
  var app = this.__app,
      controller, views, engine,
      request = this.__request;
  
  raw = (raw || app.config.rawViews);
  
  if (typeof data == 'boolean') {
    raw = data;
    data = undefined;
  }
  controller = (typeof this.__controller == 'object' 
  ? this.__controller 
  : app.controller);
  
  // Get associated helper
  var helper = controller.getHelper(),
      proto = Object.create(app.views.partials);
  
  // Make view partials available in data object
  if (data == null) data = proto;
  else { data.__proto__ = proto; }
  
  // Helper object
  if (helper) {
    helper = Object.create(helper); // Create new object with helper as prototype
    data = _.extend(helper, data); // View data overrides helper methods/properties
  }
  
  
  
  // View Locals
  data = _.extend(data, {
    app: app,
    res: this,
    req: request,
    params: request.__params,
    session: request.__session,
    cookies: request.__cookies,
    framework: framework,
    helper: helper
  });

  data.locals = data; // enable locals
  
  if (app.supports.session) data.session = this.__request.__session;

  engine = app.defaultEngine.getEngineByExtension(this.getViewPath(view));
  
  if (engine && engine.multiPart === false) {
    // Force raw to true if template is not multipart
    raw = true;
    this.engine = engine;
  }

  views = (raw ? [view] : ['@header', view, '@footer']);
  if (view == '#404') {
    this.statusCode = 404;
  } else {
    if (view == '#500') this.statusCode = 500;
  }
  
  this.__runtimeData = {
    buffer: '',
    data: data,
    views: views,
    viewCounter: 0,
    currentView: null,
    controller: controller,
    mainView: view,
  };
  renderViewBuffer.call(this);
}

/**
  Renders the view buffer
  
  @private
 */
 
var httpErrors = ['4', '5']; // 4xx, 5xx

function renderViewBuffer() {
  var buffer, codeBlock, controller, data, logData, relPath, request,
      template, view, viewBuffers, viewCaching, viewCallbacks,
      runtimeData = this.__runtimeData,
      app = this.__app,
      cacheStore = app.resources.response_cache,
      self = this;
  
  // This block only runs when view rendering is complete
  request = this.__request;
  if (runtimeData.viewCounter === runtimeData.views.length) {
    codeBlock = function() {
      if (this.__headers['Cache-Control'] == null) {
        var httpErr = (this.statusCode).toString().charAt(0);
        var cc = (httpErrors.indexOf(httpErr) >= 0) ? 'error' : 'dynamic';
        this.setHeaders({
          'Cache-Control': app.config.cacheControl[cc]
        });
      }
      if (!request.__isStatic && (typeof request.sessionChanged == "function" 
      ? request.sessionChanged() 
      : void 0)) {
        request.saveSessionState(function() {
          self.sendHeaders();
          self.end(runtimeData.buffer, app.config.encoding);
        });
      } else {
        this.sendHeaders();
        this.end(runtimeData.buffer, app.config.encoding);
      }
    };
    if (cacheStore != null && this.__doResponseCache === true) {
      cacheStore.set("response_cache_" + this.cacheID, runtimeData.buffer, function(err, info) {
        if (err) {
          app.serverError(self, [err]);
        } else {
          app.debug("Cached response for " + self.cacheID);
          return codeBlock.call(self);
        }
      });
    } else {
      codeBlock.call(self);
    }
    return;
  }
  
  viewCaching = app.viewCaching;
  viewCallbacks = app.views.callbacks;
  viewBuffers = app.views.buffers;
  data = runtimeData.data;
  controller = runtimeData.controller;
  view = runtimeData.views[runtimeData.viewCounter];
  template = this.getViewPath(view);
  
  if (typeof template == 'undefined') {
    // the specified view does not exist
    if (view) app.serverError(this, ['View does not exist: ' + controller.getAlias() + '/' + view]);
    return;
  }
  
  data.__filename = template;
  data.__dirname = pathModule.dirname(template);

  // Set engine for specific template
  self.engine = app.defaultEngine.getEngineByExtension(template);
  relPath = app.relPath(template, app.mvcpath.slice(1) + 'views');

  if (viewCaching) {
    if (framework.util.isTypeOf(viewCallbacks[relPath], 'function')) {
      try {
        buffer = viewCallbacks[relPath](data);
      } catch (e) {
        buffer = e;
      }
      if (typeof buffer == 'string') {
        app.emit('view_cache_access', app, relPath);
        runtimeData.buffer += buffer;
        runtimeData.viewCounter++;
        renderViewBuffer.call(this);
        return;
      } else {
        app.emit('view_cache_access', app, relPath);
        logData = [relPath, buffer];
        app.serverError(this, logData);
        return;
      }
    } else if ((viewBuffers[relPath] != null) && util.isArray(viewBuffers[relPath])) {
      app.emit('view_cache_access', app, relPath);
      logData = viewBuffers[relPath];
      app.serverError(this, logData);
      return;
    }
  }
  pathModule.exists(template, function(exists) {
    if (viewCaching) app.emit('view_cache_store', app, relPath);
    if (exists) {
      fs.readFile(template, 'utf-8', function(err, templateBuffer) {
        if (err) {
          logData = viewBuffers[relPath] = [relPath, 'Unable to read file'];
          if (viewCaching) viewBuffers[relPath] = logData;
          app.serverError(self, logData);
        } else {
          if (self.engine.async) {
            
           self.once('__async_template_done', function(buffer) {
             if (typeof buffer == 'string') {
               runtimeData.buffer += buffer;
               runtimeData.viewCounter++;
               renderViewBuffer.call(self);
             } else {
               logData = [relPath, buffer];
               if (viewCaching) viewBuffers[relPath] = logData;
               app.serverError(self, logData);
             }
           });
           
           self.engine.render(templateBuffer, data, relPath);
           
          } else {
            
            buffer = self.engine.render(templateBuffer, data, relPath);
            if (typeof buffer == 'string') {
              runtimeData.buffer += buffer;
              runtimeData.viewCounter++;
              renderViewBuffer.call(self);
            } else {
              logData = [relPath, buffer];
              if (viewCaching) viewBuffers[relPath] = logData;
              app.serverError(self, buffer);
            }
            
          }
        }
      });
    } else {
      logData = viewBuffers[relPath] = [relPath, "The file can't be found"];
      if (viewCaching) viewBuffers[relPath] = logData;
      app.serverError(self, logData);
    }
  });
}

/**
  Internal redirection function.
  
  @param {string} location
  @private
 */

function redirect(location) {
  if (this._header != null) return;
  this.statusCode = 302;
  
  if (! framework.regex.url.test(location) ) {
    location = this.__app.url(location);
  }
  
  this.__headers = _.extend({
    Location: location
  }, this.__app.config.headers);
  if (this.__setCookie.length > 0) this.setHeader('Set-Cookie', this.__setCookie);
  this.headerFilter();
  this.writeHead(this.statusCode, this.__headers);
  this.end();
}
