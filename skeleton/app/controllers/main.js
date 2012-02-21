/*jshint undef: false */

function MainController(app) {
  
  get('/', function(req, res) {
    res.render('index', {
      myLink: {src: 'http://google.com/script.js'}
    });
  });

}

module.exports = MainController;