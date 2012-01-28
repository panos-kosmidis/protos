
var app = require('../fixtures/bootstrap');

var engine = 'coffeekup';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, 'text main_%s(locals)');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('CoffeeKup', engine, '/coffeekup.ck.html', module);