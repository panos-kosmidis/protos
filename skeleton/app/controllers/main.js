/*jshint undef: false */

function MainController() {
  
  get('/', function(req, res) {
    res.render('index', {data: {name: 'ernie'}});
  });

}

module.exports = MainController;