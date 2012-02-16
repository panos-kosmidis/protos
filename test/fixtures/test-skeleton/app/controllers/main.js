/*jshint undef: false */

function MainController(app) {
  
  var util = require('util');
  
  get('/', function(req, res) {
    res.render('index');
  });
  
  /* File Download */
  
  get('/download', function(req, res) {
    res.download(app.fullPath('/public/robots.txt'), req.queryData.file);
  });
  
  /* JSON Response */
  
  get('/:name.json', {name: 'alpha_dashes'}, function(req, res, params) {
    req.queryData.file = params.name + '.json';
    res.json(req.queryData, req.queryData.jsoncallback);
  });
  
  /* View Engine Tests */
  
  get('/:engine.:ext', {engine: app.engineRegex, ext: /^[a-z]+(\.[a-z]+)?$/}, function(req, res) {
    var engine = req.params.engine,
        ext = req.params.ext;
    var view = 'main/' + engine + '.' + ext;
    // console.exit(view);
    res.render(view, {prefix: 'Rendered Partial:'}, true);
  });
  
  /* Response Caching Tests */
  
  get('/response-:cache/:id', {cache: /^(cache|nocache)$/, id: 'integer'}, function(req, res) {
    if (req.params.cache == 'cache') res.useCache('test_cache');
    res.render('response-cache');
  });
  
  /* Header Tests */
  
  get('/setheaders', function(req, res, params) {
    res.setHeaders(req.queryData);
    res.sendHeaders();
    res.end('');
  });

  /* Cookie Tests */
  
  get('/setcookie/:name/:value', {name: 'alpha', value: 'alnum_dashes'}, function(req, res, params) {
    res.setCookie(params.name, params.value, req.queryData);
    res.sendHeaders();
    res.end('');
  });
  
  get('/removecookie/:name', {name: 'alpha'}, function(req, res, params) {
    res.removeCookie(params.name);
    res.sendHeaders();
    res.end('');
  });
  
  get('/removecookies/:names', {names: 'alpha_dashes'}, function(req, res, params) {
    res.removeCookies.apply(res, params.names.split('-'));
    res.sendHeaders();
    res.end('');
  });
  
  get('/hascookie/:name', {name: 'alpha'}, function(req, res, params) {
    var ans = res.hasCookie(params.name) ? 'YES' : 'NO';
    res.sendHeaders();
    res.end(ans);
  });
  
  get('/getcookie/:name', {name: 'alpha'}, function(req, res, params) {
    var ans = res.getCookie(params.name) || 'NULL';
    res.sendHeaders();
    res.end(ans);
  });
  
  /* Redirection Tests */
  
  get('/redirect/:context', {context: /^(test|home|login)$/}, function(req, res, params) {
    switch (params.context) {
      case 'test':
        res.redirect('/test');
        break;
      case 'home':
        app.home(res);
        break;
      case 'login':
        app.login(res);
        break;
    }
  });
  
}

module.exports = MainController;