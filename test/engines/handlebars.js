
var app = require('../fixtures/bootstrap');

var engine = 'handlebars';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '{{> main_%s}}');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Handlebars', engine, '/handlebars.hb.html', module);