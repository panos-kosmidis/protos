
/* Travis Testing Environment */

function Travis(app) {
  
  // http://about.travis-ci.org/docs/user/database-setup/
  
  var mysql = app.config.database.mysql;
  
  // Override mysql configuration on travis
  
  mysql.host = '0.0.0.0';
  mysql.user = 'root';
  mysql.password = '';
  
  // Note: Redis uses default settings, no need to configure
  
}

module.exports = Travis;