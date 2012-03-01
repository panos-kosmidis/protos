
var app = require('../fixtures/bootstrap');

var engine = 'hogan';

app._addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{{> main_%s}}\n');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Hogan', engine, '/hogan.hg.html', module);