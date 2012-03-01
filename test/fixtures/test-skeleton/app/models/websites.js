
function WebsitesModel() {
  
  this.driver = 'mongodb:nocache';
  
  this.properties = {
    name: {type: 'string', required: true},
    url: {type: 'string', required: true}
  }

}

module.exports = WebsitesModel;