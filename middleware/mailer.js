
var app = corejs.app,
    util = require('util'),
    nodemailer = require('nodemailer'),
    Application = app.constructor,
    allowedTransports = ['SMTP', 'SES', 'sendmail'];
    
// http://www.nodemailer.org/

function Mailer(config, middleware) {
  
  // Middleware configuration
  var keys = Object.keys(config);
  if (keys.length == 0) config = {sendmail: true};
  
  // Validate mail transports
  if (keys.length > 1) {
    // More than one transport configuration specified
    throw new Error(util.format("Only one of the following allowed: %s", allowedTransports.join(', ')));
  } else {
    var transport = Object.keys(config).pop();
    if (allowedTransports.indexOf(transport) >= 0) {
      // Configure nodemailer transport
      nodemailer[transport] = config[transport];
    } else {
      // Provided transport not supported
      throw new Error(util.format("Mail transport not supported: '%s'. It should be one of: %s", 
        transport, allowedTransports.join(', ')));
    }
  }
  
}

/**
  Sends mail using the configured transport
  
  @param {object} data
  @public
 */

Application.prototype.sendmail = function(data) {
  return nodemailer.send_mail(data);
}

module.exports = Mailer;