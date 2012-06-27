
function CompaniesModel(app) {
  
  this.driver = 'mongodb';
  
  this.properties = {
    name: {type: 'string', required: true}
  }
  
  this.hasOne = 'blog(website)';
  
}

module.exports = CompaniesModel;