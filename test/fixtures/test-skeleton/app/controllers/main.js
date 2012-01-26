/*jshint undef: false */

function MainController() {
  
  this.authRequired = false;
  
  get('/:engine', function(req, res) {
    res.render('index');
  });

}

module.exports = MainController;