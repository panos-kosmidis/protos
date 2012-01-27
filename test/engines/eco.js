
var app = require('../fixtures/bootstrap');

app.addFilter('eco_template', function(data) {
  return app.__addEnginePartials('eco', data, '<%- @main_%s(@locals) %>');
});

app.__createEngineBatch('Eco', '/eco.eco', module);