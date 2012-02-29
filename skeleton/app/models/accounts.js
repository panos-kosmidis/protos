
function AccountsModel(app) {
  
  this.driver = 'mongodb';
  
  this.properties = {
    settings: {type: 'object'},
    tokens: {type: 'object'}
  }
  
  this.belongsTo = 'user.account';
  
}

module.exports = AccountsModel;