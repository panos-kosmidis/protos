
var app = require('../fixtures/bootstrap');

var engine = 'swig';

app.attachFilter(engine + '_template', function(data) {
  data = app.addEnginePartials(engine, data, '{{ main_%s(locals) }}');
  // console.exit(data);
  return data;
});

app.createEngineBatch('Swig', engine, '/swig.sw.html', module);