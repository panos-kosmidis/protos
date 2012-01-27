
var app = require('../fixtures/bootstrap');

app.addFilter('handlebars_template', function(data) {
  data = app.__addEnginePartials('handlebars', data, '{{{main_hogan}}}');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Handlebars', '/handlebars.hb.html', module);