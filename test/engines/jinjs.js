
var app = require('../fixtures/bootstrap');

var engine = 'jinjs';

app.addFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{{main_%s(locals)}}');
  // console.exit(data);
  return data;
});

app.createEngineBatch('JinJS', engine, '/jinjs.jin.html', module);