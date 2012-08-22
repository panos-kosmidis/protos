
var app = require('../fixtures/bootstrap');

var engine = 'kiwi';

app.addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{{= main_%s(locals)}}');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Kiwi', engine, '/kiwi.kw.html', module);