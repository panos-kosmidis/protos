
function GroupsModel(app) {
  
  this.driver = 'mongodb';
  
  this.properties = {
    name: {type: 'string', required: true},
    gid: {type: 'string', default: function() { return Math.random().toString(); }}
  }
  
  this.hasMany = 'users';
  
}

module.exports = GroupsModel;