
var app = require('../fixtures/bootstrap');

var engine = 'jqtpl';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '{{html main_%s(locals)}}');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('JqueryTemplate', engine, '/jqtpl.jq.html', module);