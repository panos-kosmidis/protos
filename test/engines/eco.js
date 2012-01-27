
var app = require('../fixtures/bootstrap');

app.addFilter('eco_template', function(data) {
  data = app.__addEnginePartials('eco', data, '<%- @main_%s(@locals) %>');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Eco', '/eco.eco', module);