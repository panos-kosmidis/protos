
var app = require('../fixtures/bootstrap');

var engine = 'jazz';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '{main(locals)}');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Jazz', engine, '/jazz.jazz', module);