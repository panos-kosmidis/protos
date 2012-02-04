
var inspect = require('util').inspect;

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
      res.end(inspect(session));
    });
  });
  
}

module.exports = SessionController;