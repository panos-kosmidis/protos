
/**
  Session
  
  Provides complete session management for applications.
  
  » Configuration Options
  
    {boolean} guestSessions: If set to true, will enable sessions for guest users
    {int} regenInterval: Interval to regenerate the sessionId (seconds)
    {int} permanentExpires: Permanent sessions timeout (seconds)
    {int} temporaryExpires: Temporary (browser) sessions timeout (seconds)
    {int} guestExpires: Guest sessions timeout (seconds)
    {array} typecastVars: Session properties to automatically typecast when loading session data
    {string} sessCookie: Default session cookie name
    {string} hashCookie: Default session hash name
    {string} defaultUserAgent: Default user agent when not set
    {string} salt: Salt used to generate session hashes
    {string|object} storage: Resource string pointing to the storage backend to use, or Storage instance.

 */

var app = protos.app;

var _ = require('underscore'),
    util = require('util'),
    node_uuid = protos.requireDependency('node-uuid', 'Session Middleware', 'session'),
    slice = Array.prototype.slice;

require('./request.js');
require('./response.js');
  
function Session(config, middleware) {

  // Automatically load cookie_parser module dependency
  if (!app.supports.cookie_parser) {
    throw new Error("The 'session' middleware requires 'cookie_parser'.");
  }

  app[middleware] = this; // Attach to application singleton

  // Middleware configuration defaults
  this.config = _.extend({
    guestSessions: false,
    regenInterval: 5 * 60,
    permanentExpires: 30 * 24 * 3600,
    temporaryExpires: 24 * 3600,
    guestExpires: 7 * 24 * 3600,
    typecastVars: [],
    autoTypecast: true,
    sessCookie: "_sess",
    hashCookie: "_shash",
    defaultUserAgent: "Mozilla",
    salt: null
    }, config);
    
    if (typeof config.salt != 'string') throw new Error("Session: you must specify a salt");

    if (typeof config.storage == 'object') this.storage = config.storage;
    else if (typeof config.storage == 'string') this.storage = app._getResource('storages/' + config.storage);
    else throw new Error("The 'session' middleware requires a storage to be passed in config.");

    this.className = this.constructor.name;

    protos.util.onlySetEnumerable(this, ['className', 'storage']);
    
  }

  Session.prototype.storage = null;


/**
  Creates a session

  @param {object} req
  @param {object} res
  @param {object} data
  @param {boolean} persistent
  @param {function} callback
  @public
*/

Session.prototype.create = function(req, res, data, persistent, callback) {
  var expires, guest, hashes, multi, userAgent, userAgentMd5, self = this;
  guest = null;
  if (persistent == 'guest') {
    guest = true;
    persistent = true;
  }
  app.debug( guest ? 'Creating guest session' : 'Creating session' );
  userAgent = req.headers['user-agent'] || this.config.defaultUserAgent;
  userAgentMd5 = app.md5(userAgent);
  hashes = this.createHash(userAgent, guest);

  if (guest) {
    // Guest sessions have their own expiration timeout
    expires = this.config.guestExpires;
  } else {
    // Is the session persistent ? If yes, timeout should be permanentExpires
    // Otherwise, timeout should be temporaryExpires (browser session)
    expires = (persistent ? this.config.permanentExpires : this.config.temporaryExpires);

    data = _.extend(data, {
      fpr: hashes.fingerprint,
      ua_md5: userAgentMd5,
      pers: (persistent ? 1 : 0)
    });
  }

  multi = this.storage.multi();
  if (!guest && req.session.guest && req.hasCookie(this.config.sessCookie)) {
    multi.delete(req.getCookie(this.config.sessCookie));
  }
  multi.setHash(hashes.sessId, data);
  multi.expire(hashes.sessId, expires);

  multi.exec(function(err, replies) {
    if (err) app.log(err);
    else {

      // Expires has been calculated a few lines back
      res.setCookie(self.config.sessCookie, hashes.sessId, {
        expires: expires
      });

      if (guest) {
        data.guest = parseInt(data.guest, 10);
      } else {
        res.setCookie(self.config.hashCookie, hashes.fingerprint, {
          expires: self.config.regenInterval
        });
      }

      data = self.typecast(data);
      req.session = data;
      req.__origSessionState = _.extend({}, data);
      req.__jsonSession = JSON.stringify(data);
      app.emit('load_session', hashes.sessId, req.session);
      callback.call(self, req.session, hashes, expires);
    }
  });
}

/**
  Destroys a session

  @param {object} req
  @param {object} res
  @param {function} callback
  @public
*/

Session.prototype.destroy = function(req, res, callback) {
  var fingerprint, sessId, self = this;
  app.debug('Destroying session');
  if (req.hasCookie(this.config.sessCookie) && req.session) {
    sessId = req.getCookie(this.config.sessCookie);
    fingerprint = this.getFingerprint(req, sessId);
    
    if (fingerprint == req.session.fpr) {
      this.storage.delete(sessId, function(err) {
        if (err) app.serverError(res, err);
        else {
          res.removeCookies(self.config.sessCookie, self.config.hashCookie);
          callback.call(self);
        }
      });
    } else {
      res.removeCookies(this.config.sessCookie, this.config.hashCookie);
      app.login(res);
    }
  } else {
    app.login(res);
  }
}

/**
  Loads the session

  @param {object} req
  @param {object} res
  @param {function} callback
  @private
*/

Session.prototype.loadSession = function(req, res, callback) {
  var fingerprint, sessHash, sessId, self;

  if (req.__loadedSession === true) {
    callback.call(this);
    return;
  } else {
    req.session = {};
    req.__loadedSession = true;
  }

  self = this;

  sessId = req.getCookie(this.config.sessCookie);
  sessHash = req.getCookie(this.config.hashCookie);
  fingerprint = self.getFingerprint(req, sessId);

  if (sessId) { // A cookie with sessId exists

    // Get the session data from storage
    this.storage.getHash(sessId, function(err, data) {
      var expires, guest, hashes, multi, newHash, newSess, ua_md5, userAgent;

      // If errors retrieving session data, respond with HTTP/500 & log error
      if (err) { app.serverError(res, err); return;}

      // If it's not a user session, it's a guest session
      guest = (data.user == null);

      if (_.isEmpty(data)) { // If data is empty

        if (self.config.guestSessions) {
          // => Create guest session
          res.removeCookie(self.config.hashCookie);
          self.createGuestSession(req, res, callback);
        } else {
          // => Remove cookies, contain invalid or expired session data
          req.removeCookies(self.config.sessCookie, self.config.hashCookie);
          callback.call(self, {});
        }

      } else { // Data is not empty

        if (guest) data.guest = parseInt(data.guest, 10);
        else  data.pers = parseInt(data.pers, 10);

        data = self.typecast(data);

        if (guest) { // If guest session detected

          app.debug('Loading guest session');
          req.session = data;
          req.__origSessionState = _.extend({}, data);
          req.__jsonSession = JSON.stringify(data);
          app.emit('load_session', sessId, req.session);
          callback.call(self);

          } else if (sessHash) { // If session hash detected

            if (sessHash == fingerprint && sessHash == data.fpr) { // If cookie hash matches session hash

              // Load user session
              app.debug('Loading session');
              req.session = data;
              req.__origSessionState = _.extend({}, data);
              req.__jsonSession = JSON.stringify(data);
              app.emit('load_session', sessId, req.session);
              callback.call(self);

            } else { // Else if session hash doesn't match

              // This could be somebody trying to impersonate as someone else

              // a) Remove the cookies from client, and redirect to login page
              req.removeCookies(self.config.sessCookie, self.config.hashCookie);
              app.login(res);

              // Log message
              var logMessage = util.format("\n\
SECURITY WARNING: %s tried to access session '%s' with hash: '%s'\n\
Request Method: %s,\n\
Request Headers: \n%s\n", req.socket.remoteAddress, sessId, sessHash, req.method, util.inspect(req.headers));

              // b) Log security event
              app.log(logMessage);

              // c) Emit security warning
              app.emit('security_warning', 'session', { // context, data
                sessId: sessId,
                sessHash: sessHash,
                fingerprint: fingerprint,
                sessionData: data
              });

            }

          } else { // Else (session hash not detected)

            userAgent = req.headers['user-agent'] || self.config.defaultUserAgent;
            ua_md5 = app.md5(userAgent);

            if (ua_md5 == data.ua_md5) { // If user agent's md5 matches the one in session
              hashes = self.createHash(userAgent);
              newSess = hashes.sessId;
              newHash = hashes.fingerprint;

              /*
              Is data persistent ? => use permanentExpires
              Otherwise:
              -- Is it a user session ? => use temporaryExpires
              -- Otherwise => use guestExpires
              */

              expires = self.config[(data.pers ? 'permanentExpires' : (data.user ? 'temporaryExpires' : 'guestExpires'))];

              multi = self.storage.multi();
              multi.updateHash(sessId, {fpr: newHash});
              multi.rename(sessId, newSess);
              multi.expire(newSess, expires);
              
              multi.exec(function(err, replies) {
                if (err) {
                  app.serverError(res, err);
                } else {
                  res.setCookie(self.config.sessCookie, newSess, {
                    expires: expires
                  });
                  res.setCookie(self.config.hashCookie, newHash, {
                    expires: self.config.regenInterval
                  });
                  req.cookies[self.config.sessCookie.toLowerCase()] = newSess;
                  data.fpr = req.cookies[self.config.hashCookie.toLowerCase()] = newHash;
                  req.session = data;
                  req.__origSessionState = _.extend({}, data);
                  req.__jsonSession = JSON.stringify(data);
                  app.emit('load_session', sessId, req.session);
                  app.debug('Regenerating session');
                  callback.call(self);
                }
              });

            } else { // Else (if user agent doesn't match the one in session)

              // => Remove cookies from client, and redirect to login
              res.removeCookies(self.config.sessCookie, self.config.hashCookie);
              app.login(res);

            }
          }
        }

      });

    } else if (this.config.guestSessions) { // If guestSessions are enabled

      res.removeCookie(this.config.hashCookie);
      this.createGuestSession(req, res, callback);

    } else { // sessId is not present

      // Remove session hash if it's present
      if (sessHash) res.removeCookie(this.config.hashCookie);

      req.session = req.__origSessionState = {};
      req.__jsonSession = '';
      
      app.emit('load_session', sessId, req.session);
      callback.call(self);
    }
  }

/**
  Creates a guest session

  @param {object} req
  @param {object} res
  @param {object} data (optional)
  @param {function} callback
  @public
*/

Session.prototype.createGuestSession = function(req, res, data, callback) {
  var self = this;
  
  if (!callback) { 
    callback = data; 
    data = {guest: '1'};
  } else {
    data.guest = '1';
  }
  
  this.create(req, res, data, 'guest', function(data, hashes, expires) {
    return callback.call(self, data, hashes, expires);
  });
}

/**
  Generates a session fingerprint for a given session ID

  @param {object} req
  @param {string} sessId
  @returns {string} fingerprint hash
  @private
*/

Session.prototype.getFingerprint = function(req, sessId) {
  var userAgent = (req.headers['user-agent'] || this.config.defaultUserAgent);
  return app.md5(userAgent + sessId + this.config.salt);
}

/**
  Creates a session hash

  @param {string} userAgent
  @param {boolean} guest
  @returns {object}
  @private
*/

Session.prototype.createHash = function(userAgent, guest) {
    var sessId = app.md5(node_uuid());
    if (guest) {
      return {sessId: sessId};
    } else {
      var fingerprint = app.md5(userAgent + sessId + this.config.salt);
      return {sessId: sessId, fingerprint: fingerprint};
    }
}

/**
  Performs automatic type coercion on session data.

  The session variables that will be converted, are specified in the `typecastVars` array.

  @param {object} data
  @returns {object} with data converted
  @private
*/

Session.prototype.typecast = function(data) {
  var tvars = this.config.typecastVars;
  for (var key,i=0; i < tvars.length; i++) {
    key = tvars[i];
    if (data[key] != null) data[key] = protos.util.typecast(data[key]);
  }
  return data;
}

module.exports = Session;
