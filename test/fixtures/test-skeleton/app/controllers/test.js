
var util = require('util');

function TestController(app) {

  get('/', function(req, res) {
    res.render('index');
  });
  
}

module.exports = TestController;