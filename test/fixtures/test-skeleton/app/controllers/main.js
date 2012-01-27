/*jshint undef: false */

function MainController() {
  
  this.authRequired = false;
  
  get('/', function(req, res) {
    res.render('index');
  });
  
  get('/:engine.:ext', {engine: app.engineRegex, ext: /^[a-z]+(\.[a-z]+)?$/}, function(req, res) {
    var engine = req.__params.engine,
        ext = req.__params.ext;
    var view = 'main/' + engine + '.' + ext;
    // console.exit(view);
    res.render(view, {prefix: 'Rendered Partial:'}, true);
  });
  
}

module.exports = MainController;