
var app = corejs.app;

function ProductionUrl() {
  
  var url = app.baseUrl;
  
  // Remove port number from url
  url = url.slice(0, url.lastIndexOf(':'));
  
  // Store the modified url
  app.baseUrl = url;
  
}

module.exports = ProductionUrl;