
var app = require('../fixtures/bootstrap');

var engine = 'hamlcoffee';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '!= @main_%s(@locals)');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('HamlCoffee', engine, '/hamlcoffee.hamlc', module);