/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.useCache('index_cache');
    res.render('index');
  });
  
}

module.exports = MainController;