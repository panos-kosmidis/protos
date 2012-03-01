
function GroupsModel(app) {
  
  this.driver = 'mongodb:nocache';
  
  this.properties = {
    name: {type: 'string', required: true}
  }
  
  this.hasMany = 'buddies';
  
}

module.exports = GroupsModel;