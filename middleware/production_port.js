
var app = corejs.app;

function ProductionPort() {
  
  var url = app.baseUrl;
  
  url = url.slice(0, url.lastIndexOf(':'));
  
  app.baseUrl = url;
  
}

module.exports = ProductionPort;