
var app = require('../fixtures/bootstrap');

app.addFilter('hamlcoffee_template', function(data) {
  data = app.__addEnginePartials('hamlcoffee', data, '!= main_%s(locals)');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('HamlCoffee', '/hamlcoffee.hamlc', module);