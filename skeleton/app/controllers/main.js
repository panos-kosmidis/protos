/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.render('main');
  });

}

module.exports = MainController;