
var app = require('../fixtures/bootstrap');

var engine = 'whiskers';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '{>main_%s}');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Whiskers', engine, '/whiskers.wk.html', module);