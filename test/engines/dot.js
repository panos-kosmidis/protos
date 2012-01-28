
var app = require('../fixtures/bootstrap');

var engine = 'dot';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '{{= locals.main_%s(locals)}}');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Dot', engine, '/dot.dot', module);