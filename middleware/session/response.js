
/* Session Response methods */

var app = corejs.app,
    http = require('http'),
    slice = Array.prototype.slice,
    OutgoingMessage = http.OutgoingMessage;

var _end = OutgoingMessage.prototype.end;

/**
  Replaces the default end method, providing support for

  @params {*mixed}
*/

OutgoingMessage.prototype.end = function() {
  var args = slice.call(arguments, 0),
  self = this,
  req = this.request;

  if (app.supports.session && req.sessionChanged()) {
    req.saveSessionState(function() {
      _end.apply(self, args);
    });
  } else {
    _end.apply(this, args);
  }
}