
function Initialize(app) {

  app.debugMode = true;

  app.usersModel.new({
    user: 'ernie', 
    pass: 'abcd1234',
  }, function(err) {
    if (err) app.log(err);
    else {
      console.exit('Successfully created user\n');
    }
  });

}

module.exports = Initialize;