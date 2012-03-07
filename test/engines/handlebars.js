
var app = require('../fixtures/bootstrap');

var engine = 'handlebars';

app.attachFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{{> main_%s}}');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Handlebars', engine, '/handlebars.hb.html', module);