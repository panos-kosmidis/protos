
function UsersModel(app) {
  
  this.driver = 'mongodb';
  
  this.properties = {
    user  : {type: 'string', unique: true, required: true, validates: 'alnum_underscores'},
    pass  : {type: 'string', required: true, validates: 'password'},
    date  : {type: 'timestamp', validates: 'timestamp', default: function() { return new Date(); }}
  }
  
  this.hasOne = ['company', 'website'];
  
  this.hasMany = ['groups', 'products'];
  
}

module.exports = UsersModel;