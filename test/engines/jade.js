
var app = require('../fixtures/bootstrap');

var engine = 'jade';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '!= main_%s(locals)');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Jade', engine, '/jade.jade', module);