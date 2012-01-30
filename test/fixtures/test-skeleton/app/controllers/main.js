/*jshint undef: false */

function MainController() {
  
  /* Landing Page */
  
  get('/', function(req, res) {
    res.render('index');
  });
  
  /* View Engine Tests */
  
  get('/:engine.:ext', {engine: app.engineRegex, ext: /^[a-z]+(\.[a-z]+)?$/}, function(req, res) {
    var engine = req.__params.engine,
        ext = req.__params.ext;
    var view = 'main/' + engine + '.' + ext;
    // console.exit(view);
    res.render(view, {prefix: 'Rendered Partial:'}, true);
  });
  
  /* Response Caching Tests */
  
  get('/test/response-:cache/:id', {cache: /^(cache|no\-cache)$/, id: 'integer'}, function(req, res) {
    if (req.__params.cache == 'cache') res.useCache('test_cache');
    res.render('response-cache');
  });
  
}

module.exports = MainController;