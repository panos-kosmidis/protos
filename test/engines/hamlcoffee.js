
var app = require('../fixtures/bootstrap');

var engine = 'hamlcoffee';

app.addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '!= @main_%s(@locals)');
  // console.exit(data);
  return data;
});

app.createEngineBatch('HamlCoffee', engine, '/hamlcoffee.hamlc', module);