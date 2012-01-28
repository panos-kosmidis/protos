/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.render('dot');
  });

}

module.exports = MainController;