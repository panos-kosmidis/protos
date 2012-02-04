
var inspect = require('util').inspect;

function SessionController(app) {
  
  get('/', function(req, res) {
    res.sendHeaders();
    res.end('{SESSION CONTROLLER}');
  });
  
  get('/create/:user', {user: 'alpha'}, function(req, res, params) {
    var perm = req.__queryData.permanent == '1';
    app.session.create(req, res, {user: params.user}, true, function(session) {
      app.globals.userSession = session;
      res.sendHeaders();
      res.end(inspect(session));
    });
  });
  
}

module.exports = SessionController;