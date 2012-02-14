/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.render('index');
  }, 'put');
  
}

module.exports = MainController;