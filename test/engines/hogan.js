
var app = require('../fixtures/bootstrap');

var engine = 'hogan';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '{{> main_hogan}}');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Hogan', engine, '/hogan.hg.html', module);