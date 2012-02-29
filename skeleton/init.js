
function Initialize(app) {

  // app.usersModel.create({
  //   user: 'ernie',
  //   pass: 'passme',
  // }, function(err, model) {
  //   console.exit(err || model);
  // });
  
  app.usersModel.get('4f4e33b1c4b032a833000001', function(err, model) {
    if (err) throw err;
    else {
      
      console.exit(model);
      
      // model.array.push(99);
      // model.object.a = 11;
      // model.object.b = 22;
      // 
      // model.save(function(err) {
      //   console.exit(err);
      // });
      
    }
  });

}

module.exports = Initialize;