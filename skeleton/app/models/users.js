
function UsersModel(app) {
  
  this.properties = {
    id    : {type: 'integer'},
    user  : {type: 'string', unique: true, required: true, validates: 'alnum_underscores'},
    pass  : {type: 'string', required: true, validates: 'password'},
    date  : {type: 'timestamp', validates: 'timestamp'}
  }
  
}

module.exports = UsersModel;