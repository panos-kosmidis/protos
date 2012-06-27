
function AccountsModel(app) {
  
  this.driver = 'mongodb';
  
  this.properties = {
    settings: {type: 'object'}
  }
  
  this.belongsTo = ['buddy.account', 'company.account'];
  
}

module.exports = AccountsModel;