/*jshint immed: false */

var inspect = require('util').inspect;

function TestController(app) {

  /* Dynamic routes, covering all route methods */
  
  for (var key in this) {
    if (key != 'super_' && this.hasOwnProperty(key) && this[key] instanceof Function) {
      (function(k) {
        this[k]('/'+ k, function(req, res) {
          res.sendHeaders();
          res.end('{'+ k +'}\n\n');
        });
      }).call(this, key);
    }
  }
  
  /* GET */
  
  // Parameter validation: valid
  // Parameter validation: invalid
  
  get('/qstring/:rule1', {rule1: /^abcde$/}, function(req, res, params) {
    res.sendHeaders();
    res.end(inspect(params));
  });
  
  // Query String values + no param validation
  get('/qstring', function(req, res) {
    res.sendHeaders();
    res.end(inspect(req.__queryData));
  });
  
  // Query String values + param validation 
  get('/qstring/:rule1/:rule2', {rule1: 'alpha', rule2: 'integer'}, function(req, res, params) {
    res.sendHeaders();
    res.end(inspect(params) + ' ' + inspect(req.__queryData));
  });
  
  // Query String validation + no param validation 
  get('/qstring/novalidate-param', {name: 'alpha', id: 'integer', trigger: /^(abc|def)$/}, function(req, res) {
    this.getQueryData(req, function(fields) {
      res.sendHeaders();
      res.end(inspect(fields));
    });
  });
  
  // Query String validation + param validation
  get('/qstring/validate/:rule1/:rule2', {
    rule1: 'alpha', 
    rule2: /^(ghi|jkl)$/,
    name: 'alpha',
    id: 'integer'
  }, function(req, res, params) {
    this.getQueryData(req, function(fields) {
      res.sendHeaders();
      res.end(inspect(params) + ' ' + inspect(fields));
    });
  });
  
  // Validation Messages: strings
  // Validation Messages: functions
  get('/qstring/messages', {
    word: 'alpha', 
    num: 'integer'
  },{ 
    word: 'Oops! Invalid word...',
    num: function(v) { return 'Invalid number: ' + v; }
  }, function(req, res) {
    this.getQueryData(req, function(fields) {
      res.end(inspect(fields));
    });
  });
  
  /* POST */
  
  // PostData validation + no param validation
  post('/postdata', {user: 'alpha', pass: 'integer'}, function(req, res) {
    this.getPostData(req, function(fields) {
      res.end(inspect(fields));
    });
  });
  
  // PostData validation + param validation
  post('/postdata/:account', {account: 'integer', user: 'alpha', pass: 'integer'}, function(req, res) {
    this.getPostData(req, function(fields) {
      res.end(inspect(fields));
    });
  });
  
  // PostData Validation Messages: strings
  // PostData Validation Messages: functions
  // PostData Validation Messages when ajax=1
  post('/postdata/messages', {
    user: 'alpha', 
    pass: 'integer'
  }, {
    user: 'Invalid username!',
    pass: function(p) { return "Oops! That's an invalid password: " + p; }
  },function(req, res) {
    this.getPostData(req, function(fields) {
      res.end(inspect(fields));
    });
  });
  
  /* UPLOADS */
  
  // File Uploads
  // Upload Limits & Messages
  post('/upload', function(req, res) {
    this.getPostData(req, function(fields, files) {
      if ( files.expect('**file') ) { // File should be present, and not empty
        var f = files.get('file');
        res.sendHeaders();
        res.end(inspect(f));
        files.removeAll();
      } else app.badRequest(res);
     });
  });
  
}

module.exports = TestController;