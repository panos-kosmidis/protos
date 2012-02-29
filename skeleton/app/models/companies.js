
function CompaniesModel() {
  
  this.driver = 'mongodb';
  
  this.properties = {
    name: {type: 'string', required: true}
  }
  
  this.hasOne = 'blog(website)';
  
  this.hasMany = 'employees(users)';
  
}

module.exports = CompaniesModel;