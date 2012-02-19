
var app = corejs.app,
    util = require('util'),
    aws2js = require('aws2js'),
    isArray = util.isArray;

var accessKey, secretKey;

function AmazonWebServices(config, middleware) {

  var self = this;

  // Attach instance to application
  app[middleware] = this;

  // Middleware config
  config = corejs.extend({
    accessKey: null,
    secretKey: null,
    clients: {}
  }, config);
  
  accessKey = config.accessKey;
  secretKey = config.secretKey;
  
  if (!accessKey && !secretKey) {
    throw new Error("Please specify the 'accessKey' and 'secretKey' in the config");
  }
  
  var clients = config.clients;
  
  // Configure each of the client aliases
  Object.keys(clients).forEach(function(alias) {
    
    // Check for service type
    if (!clients[alias].type) throw new Error("Missing type for client alias: " + alias);
    
    var opts = clients[alias],
        type = opts.type;
        
    var client = self.load(opts.type); delete opts.type;
    var key, args, method;
    
    // Call each property of the configuration objects with its parameters
    for (key in opts) {
      if (client.hasOwnProperty(key) && client[key] instanceof Function) {
        method = client[key];
        args = opts[key];
        method.apply(client, isArray(args) ? args : [args]);
      } else {
        throw new Error(util.format("Method not available in '%s' %s client: %s", alias, type, key));
      }
      
    }
    
    // Assign configured client to alias in instance
    self[alias] = client;
    
  });

}

AmazonWebServices.prototype.load = function(client) {
  return aws2js.load(client, accessKey, secretKey);
}

module.exports = AmazonWebServices;