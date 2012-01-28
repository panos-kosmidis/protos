/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.render('ck');
  });

}

module.exports = MainController;