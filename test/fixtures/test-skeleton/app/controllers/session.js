
var util = require('util');

function SessionController(app) {
  
  get('/', function(req, res) {
    res.sendHeaders();
    res.end('{SESSION CONTROLLER}');
  });
  
  get('/create/:user', {user: 'alpha'}, function(req, res, params) {
    var pers = req.__queryData.persistent == '1';
    app.session.create(req, res, {user: params.user}, pers, function(session) {
      app.globals.userSession = session;
      res.sendHeaders();
      res.end(util.inspect(session));
    });
  });
  
  get('/set/:varname/:value', {varname: 'alpha_dashes', value: 'alnum'}, function(req, res, params) {
    app.session.config.typecastVars.push(params.value); // automatically typecast
    req.__session[params.varname] = params.value;
    res.sendHeaders();
    res.rawHttpMessage({
      message: '{OK}',
      raw: true
    });
  });
  
  get('/:action/:varname', {action: /^(get|delete)$/, varname: 'alpha_dashes'}, function(req, res, params) {
    switch(params.action) {
      case 'get':
        var ans = util.format('{%s}', req.__session[params.varname] || '');
        res.sendHeaders();
        res.end(ans);
        break;
        
      case 'delete':
        delete req.__session[params.varname];
        res.sendHeaders();
        res.end('{OK}');
        break;
    }
  });
  
  get('/incr/:varname', {varname: 'alpha_dashes'}, function(req, res, params) {
    res.sendHeaders();
    if (req.__session[params.varname] != null) {
      req.__session[params.varname]++;
      res.end('{SUCCESS}');
    }
    else res.end('{FAIL}');
  });
  
}

module.exports = SessionController;