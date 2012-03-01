
var app = require('../fixtures/bootstrap');

var engine = 'jshtml';

app._addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '@locals.main_%s(locals)');
  // console.exit(data);
  return data;
});

app.createEngineBatch('JsHtml', engine, '/jshtml.jshtml', module);