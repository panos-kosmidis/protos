/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.render('hello', {name: 'Ernie'});
  });

}

module.exports = MainController;