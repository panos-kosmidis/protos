
var app = require('../fixtures/bootstrap');

var engine = 'ejs';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '<%- main_%s(locals) %>');
  return data;
});

app.__createEngineBatch('EJS', engine, '/ejs.ejs', module);

