/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.render('index');
  });

  get('/eco.eco', function(req, res) {
    console.exit('GOTCHA!');
  });

}

module.exports = MainController;