/*jshint undef: false */

function MainController() {
  
  var util = require('util');
  
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
  
  get('/test/response-:cache/:id', {cache: /^(cache|nocache)$/, id: 'integer'}, function(req, res) {
    if (req.__params.cache == 'cache') res.useCache('test_cache');
    res.render('response-cache');
  });
  
  /* Header Tests */
  
  get('/setheader/:name/:value', {name: 'alpha', value: 'alnum_dashes'}, function(req, res, params) {
    var headers = {};
    headers[params.name] = params.value;
    res.setHeaders(headers);
    res.sendHeaders();
    res.end('OK');
  });

  /* Cookie Tests */
  
  get('/setcookie/:name/:value', {name: 'alpha', value: 'alnum_dashes'}, function(req, res, params) {
    res.setCookie(params.name, params.value);
    res.sendHeaders();
    res.end('OK');
  });
  
  get('/removecookie/:name', {name: 'alpha'}, function(req, res, params) {
    res.removeCookie(params.name);
    res.sendHeaders();
    res.end('OK');
  });
  
  get('/removecookies/:names', {names: 'alpha_dashes'}, function(req, res, params) {
    res.removeCookies(params.names.split('-'));
    res.sendHeaders();
    res.end('OK');
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
  
}

module.exports = MainController;