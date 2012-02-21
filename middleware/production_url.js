
/**
  Production URL 

  Removes the port suffix from the application's url. 
  
  This is useful if the application is running under a proxy, 
  or if there are kernel level redirection rules (iptables).

*/

var app = corejs.app;

function ProductionUrl() {
  
  var url = app.baseUrl;
  
  // Remove port number from url
  url = url.slice(0, url.lastIndexOf(':'));
  
  // Store the modified url
  app.baseUrl = url;
  
}

module.exports = ProductionUrl;