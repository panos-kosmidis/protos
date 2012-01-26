/*jshint undef: false */

function MainController() {
  
  this.authRequired = true;
  
  get('/', function(req, res) {
    res.render('index');
  });

}

module.exports = MainController;