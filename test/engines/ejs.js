
var app = require('../fixtures/bootstrap');

var engine = 'ejs';

app.addFilter(engine + '_template', function(data) {
  if (data.indexOf('[skip]') === -1) {
    data = app.addEnginePartials(engine, data, '<?- main_%s(locals) ?>');
  }
  return data;
});

app.createEngineBatch('EJS', engine, '/ejs.ejs', module);

