
function Initialize(app) {

  app.usersModel.create({
    user: 'ernie',
    pass: 'passme'
  }, function(err, model) {
    console.exit(err || model);
  });

}

module.exports = Initialize;