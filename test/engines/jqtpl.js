
var app = require('../fixtures/bootstrap');

var engine = 'jqtpl';

app._addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{{html main_%s(locals)}}');
  // console.exit(data);
  return data;
});

app.createEngineBatch('JqueryTemplate', engine, '/jqtpl.jq.html', module);