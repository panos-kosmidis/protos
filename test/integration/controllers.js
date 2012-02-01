
// var app = require('../fixtures/bootstrap'),
//     vows = require('vows'),
//     assert = require('assert'),
//     Multi = require('multi'),
//     EventEmitter = require('events').EventEmitter;
//     
// var multi = new Multi(app);
// 
// var batch = {
//   
//   'Route functions': {
//     
//     topic: function() {
//       var promise = new EventEmitter();
//       
//       multi.exec(function(err, results) {
//         promise.emit('success', err || results);
//       });
//       
//       // return promise;
//     },
//     
//     'success': function() {}
//     
//   }
//   
// }
// 
// vows.describe('Application Controllers').addBatch(batch).export(module);