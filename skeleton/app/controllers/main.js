/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.render('index');
  });
  
  put('/howdy/:friend', {friend: 'alpha'}, function(req, res, params) {
    res.sendHeaders();
    res.end(params.friend);
  });
  
}

module.exports = MainController;