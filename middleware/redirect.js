
/**
  Redirect 
  
  Redirect all application requests to a specific URL.
  
  An HTTP/400 Response will be sent on requests other than GET/HEAD.
  
  » Examples:
  
    app.use('redirect', 'http://google.com');
  
 */

var app = protos.app;

function Redirect(url, middleware) {
  
  if (url && typeof url == 'string') {
    
    app.on('request', function(req, res) {
      req.stopRoute();
      res.setHeaders({'Connection': 'close'}); // Make sure connection is closed
      if (req.method == 'GET' || req.method == 'HEAD') res.redirect(url);
      else res.httpMessage({statusCode: 400, raw: true});
    });
    
    app.on('startup_message', function() {
      app.log('Redirecting GET requests to ' + url);
    });

  } else {
    throw new Error("The redirect middleware requires a url");
  }
  
}

module.exports = Redirect;