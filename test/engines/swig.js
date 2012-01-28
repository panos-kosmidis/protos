
var app = require('../fixtures/bootstrap');

var engine = 'swig';

app.addFilter(engine + '_template', function(data) {
  data = app.__addEnginePartials(engine, data, '{{ main_%s(locals) }}');
  // console.exit(data);
  return data;
});

app.__createEngineBatch('Swig', engine, '/swig.sw.html', module);