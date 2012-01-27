
var app = require('../fixtures/bootstrap');

app.addFilter('haml_template', function(data) {
  data = app.__addEnginePartials('haml', data, '!= main_%s(locals)');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Haml', '/haml.haml', module);