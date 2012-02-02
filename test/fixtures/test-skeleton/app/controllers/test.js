/*jshint immed: false */

var inspect = require('util').inspect;

function TestController(app) {

  /* Dynamic routes to test controllers */
  
  for (var key in this) {
    if (key != 'super_' && this.hasOwnProperty(key)) {
      // Dynamically define route
      (function(k) {
        this[k]('/'+ k, function(req, res) {
          res.sendHeaders();
          res.end('{'+ k +'}\n\n');
        });
      }).call(this, key);
    }
  }
  
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
  
  // PostData validation (POST)
  
  // Validation Messages: AJAX
  
  // Validation Messages: strings
  
  // Validation Messages: functions
  
}

module.exports = TestController;