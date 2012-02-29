
function UsersModel(app) {
  
  this.driver = 'mongodb';
  
  this.properties = {
    user    : {type: 'string', unique: true, required: true, validates: 'alnum_underscores'},
    pass    : {type: 'string', required: true, validates: 'password'},
    friends : {type: 'integer', default: 0},
    valid   : {type: 'boolean', default: true},
    date    : {type: 'timestamp', validates: 'timestamp', default: function() { return new Date(); }},
    object  : {type: 'object', default: {a: 1, b: 2, c: 3}},
    array   : {type: 'array', default: [1,2,3,4]}
  }
  
  this.hasOne = ['company', 'website'];
  
  this.hasMany = ['groups', 'products'];
  
}

module.exports = UsersModel;