
var app = require('../fixtures/bootstrap');

app.addFilter('ejs_template', function(data) {
  data = app.__addEnginePartials('ejs', data, '<%- main_%s(locals) %>');
  return data;
});

app.__createEngineBatch('EJS', '/ejs.ejs', module);

