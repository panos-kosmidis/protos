
var app = require('../fixtures/bootstrap');

var engine = 'coffeekup';

app.attachFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, 'text main_%s(locals)');
  // console.exit(data);
  return data;
});

app.createEngineBatch('CoffeeKup', engine, '/coffeekup.ck.html', module);