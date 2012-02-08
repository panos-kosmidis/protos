
function UsersModel(app) {
  
  this.validation = {
    'status': function(data) {
      return /^(enabled|disabled|onhold)$/.test(data);
    }
  }
  
  this.properties = {
    id      : {type: 'integer'},
    user    : {type: 'string', unique: true, required: true, validates: 'alnum_underscores'},
    pass    : {type: 'string', required: true, validates: 'password'},
    status  : {type: 'string', required: true, validates: 'status'},
    date    : {type: 'timestamp', validates: 'timestamp'}
  }

}

module.exports = UsersModel;