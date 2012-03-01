
var app = require('../fixtures/bootstrap');

var engine = 'ejs';

app._addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '<%- main_%s(locals) %>');
  return data;
});

app.createEngineBatch('EJS', engine, '/ejs.ejs', module);

