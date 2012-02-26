
function Initialize(app) {

  var mongoStorage = app.getResource('storages/mongodb');
  
  // mongoStorage.get(['there', 'hello'], function(err, vals) {
  //     console.exit(vals);
  //   });
  
  // mongoStorage.getHash('hash', function(err, hash) {
  //   console.exit(hash);
  // });
  
  // mongoStorage.set({
  //   name: 'ernie',
  //   hi: 'there',
  //   love: 'rachel',
  //   pet: 'tiki'
  // }, function(err) {
  //   console.exit(err);
  // });
  
  // mongoStorage.get(['name', 'hi', 'love', 'pet'], function(err, values) {
  //   console.exit(err || values);
  // });
  
  // mongoStorage.setHash('myhash', {
  //   name: 'ernie',
  //   lang: 'es-DO',
  // }, function(err) {
  // 
  //   mongoStorage.updateHash('myhash', {
  //     age: 28,
  //     lang: ['en-US', 'es-DO']
  //   }, function(err) {
  //     
  //     mongoStorage.getHash('myhash', function(err, hash) {
  //       console.exit(hash);
  //     });
  //     
  //   });
  // 
  // });
  
  // mongoStorage.deleteFromHash('myhash', 'lang', function(err) {
  //   console.exit(err);
  // });
  
  // mongoStorage.setHash('myhash', {
  //   name: 'ernie',
  //   age: 28,
  //   lang: 'es-DO'
  // }, function(err) {
  //   
  //   mongoStorage.rename('myhash', 'superhash', function(err) {
  //     console.exit(err);
  //   });
  //   
  // });
  
}

module.exports = Initialize;