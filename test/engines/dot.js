
var app = require('../fixtures/bootstrap');

var engine = 'dot';

app.attachFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{{= locals.main_%s(locals)}}');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Dot', engine, '/dot.dot', module);