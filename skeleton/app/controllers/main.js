/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.render('index');
  });
  
  get('/hello', function(req, res) {
    res.end('{HELLO WORLD}');
  });
  
}

module.exports = MainController;