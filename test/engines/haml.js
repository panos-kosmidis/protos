
var app = require('../fixtures/bootstrap');

var engine = 'haml';

app.attachFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '!= main_%s(locals)');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Haml', engine, '/haml.haml', module);