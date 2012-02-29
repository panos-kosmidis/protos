
function UsersModel(app) {
  
  this.validation = {
    'friends': function(data) {
      return (typeof data == 'number');
    }
  }
  
  this.properties = {
    user    : {type: 'string', required: true, validates: 'alnum_underscores'},
    pass    : {type: 'string', required: true, validates: 'password'},
    friends : {type: 'integer', validates: 'friends', default: 0},
    valid   : {type: 'boolean', default: true},
    date    : {type: 'timestamp', validates: 'timestamp', default: function() { return new Date(); }},
    object  : {type: 'object', default: {a: 1, b: 2, c: 3}},
    array   : {type: 'array', default: [1,2,3,4]}
  }

}

module.exports = UsersModel;