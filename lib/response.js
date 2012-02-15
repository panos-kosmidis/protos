
/* http.OutgoingMessage */

var _ = require('underscore'),
    http = require('http'),
    OutgoingMessage = http.OutgoingMessage,
    pathModule = require('path'),
    util = require('util'),
    fs = require('fs'),
    slice = Array.prototype.slice,
    searchPattern = corejs.util.searchPattern;

/**
  Renders the specified view

  @param {string} view
  @param {object} data
  @param {boolean} raw
  @public
 */

OutgoingMessage.prototype.render = function(view, data, raw) {

  var self = this,
      app = this.app;

  // Check for response_cache middleware » get response_cache resource
  var cacheStore = (app.supports.response_cache && app.resources.response_cache.storage);

  if (cacheStore && this.cacheID != null) {
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
  app = this.app;
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
  Renders a raw HTTP Message

  @param {int} statusCode
  @param {string} message
  @param {array} logData
  @public
 */

OutgoingMessage.prototype.rawHttpMessage = function(statusCode, message, logData) {
  var buffer, raw, ob, app = this.app;

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

  if (raw || this.request.isAjax === true) {

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
  if (this._header != null) return;
  this.statusCode = 302;

  if (! corejs.regex.url.test(location) ) {
    location = this.app.url(location);
  }

  this.setHeaders({Location: location});

  if (this.__setCookie.length > 0) this.setHeader('Set-Cookie', this.__setCookie);
  
  this.headerFilter();
  this.writeHead(this.statusCode, this.__headers);
  this.end();
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
      this.__headers[field] = action.call(this.app, this.request, this);
    } else {
      continue;
    }
  }
}

/**
  Sends the HTTP Headers

  @public
 */

OutgoingMessage.prototype.sendHeaders = function(extraHeaders) {
  if (this._header != null) return;

  // Set extra headers
  if (extraHeaders != null && typeof extraHeaders == 'object') this.setHeaders(extraHeaders);

  this.headerFilter();
  
  if (this.__setCookie.length > 0) this.setHeader('Set-Cookie', this.__setCookie);
  
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
  var app = this.app,
      controller, views, engine,
      request = this.request;

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
    params: request.params,
    session: request.session,
    cookies: request.cookies,
    corejs: corejs,
    helper: helper
  });

  data.locals = data; // enable locals

  if (app.supports.session) data.session = this.request.session;

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
      app = this.app,
      cacheStore = (app.supports.response_cache && app.resources.response_cache.storage),
      self = this;

  // This block only runs when view rendering is complete
  request = this.request;
  if (runtimeData.viewCounter === runtimeData.views.length) {
    codeBlock = function() {
      if (this.__headers['Cache-Control'] == null) {
        var httpErr = (this.statusCode).toString().charAt(0);
        var cc = (httpErrors.indexOf(httpErr) >= 0) ? 'error' : 'dynamic';
        this.setHeaders({
          'Cache-Control': app.config.cacheControl[cc]
        });
      }
      this.sendHeaders();
      this.end(runtimeData.buffer, app.config.encoding);
    }

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
    if (corejs.util.isTypeOf(viewCallbacks[relPath], 'function')) {
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
