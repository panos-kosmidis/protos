
var app = require('../fixtures/bootstrap');

var engine = 'jade';

app._addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '!= main_%s(locals)');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Jade', engine, '/jade.jade', module);