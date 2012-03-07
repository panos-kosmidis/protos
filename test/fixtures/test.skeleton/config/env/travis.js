
/* Travis Testing Environment */

function Travis(app) {
  
  // http://about.travis-ci.org/docs/user/database-setup/
  
  var mysql = app.config.database.mysql.nocache,
      mysqlc = app.config.database.mysql.cache;
  
  // Override mysql configuration on travis
  
  mysql.host = mysqlc.host = '0.0.0.0';
  mysql.user = mysqlc.user = 'root';
  mysql.password = mysqlc.password = '';
  
  // Note: Redis uses default settings, no need to configure
  
}

module.exports = Travis;