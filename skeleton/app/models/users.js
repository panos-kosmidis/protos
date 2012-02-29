
function UsersModel(app) {
  
  this.properties = {
    user    : {type: 'string', required: true, validates: 'alpha_underscores'},
    pass    : {type: 'string', required: true, validates: 'password'}
  }

}

module.exports = UsersModel;