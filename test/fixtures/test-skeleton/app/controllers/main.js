/*jshint undef: false */

function MainController() {
  
  this.authRequired = false;
  
  get('/', function(req, res) {
   console.exit('here');
  });

}

module.exports = MainController;