
function BuddiesModel(app) {
  
  this.driver = 'mongodb:nocache';
  
  this.properties = {
    username: {type: 'string', required: true, validates: 'alpha_underscores'},
    password: {type: 'string', required: true, validates: 'password'}
  }
  
  this.hasOne = ['company', 'profile(website)'];
  
  this.hasMany = ['groups', 'friends(buddies)'];
  
  this.belongsTo = ['company.boss', 'website.developer'];
  
  this.belongsToMany = 'company.associates';
  
}



module.exports = BuddiesModel;