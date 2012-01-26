/*jshint undef: false */

function MainController() {
  
  this.authRequired = false;
  
  get('/', function(req, res) {
    res.render('index');
  });
  
  get('/:engine.:ext', {engine: app.engineRegex, ext: /^[a-z]+$/}, function(req, res) {
    var engine = req.__params.engine,
        ext = req.__params.ext;
    res.render('main/' + engine + '.' + ext, {prefix: 'Rendered Partial:'}, true);
  });
  
}

module.exports = MainController;