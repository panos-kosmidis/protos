/*jshint undef: false */

function BlogController() {
  
  get('/', function(req, res) {
    res.render('index');
  });
  
}

module.exports = BlogController;