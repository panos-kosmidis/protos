
var app = require('../fixtures/bootstrap');

var engine = 'kernel';

app._addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{main_%s(locals)}');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Kernel', engine, '/kernel.khtml', module);