
var app = require('../fixtures/bootstrap');

var engine = 'eco';

app.attachFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '<%- @main_%s(@locals) %>');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Eco', engine, '/eco.eco', module);