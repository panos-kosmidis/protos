
var app = require('../fixtures/bootstrap');

var engine = 'whiskers';

app._addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{>main_%s}');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Whiskers', engine, '/whiskers.wk.html', module);