
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);
    
vows.describe('Markdown (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      var promise = new EventEmitter();

      // Enable markdown middleware
      app.use('markdown', {
        flags: {
          insecure: ['noLinks', 'noImage']
        },
        sanitize: ['default']
      });
      
      // Markdown tests
      app.curl('-i /markdown', function(err, buf) {
        promise.emit('success', err || buf);
      });
      
      return promise;
    },
    
    "Markdown::setFlags properly registers discount flag bits": function() {
      assert.deepEqual(app.markdown.flags, {default: 2113536, insecure: 3});
    },
    
    "The '$markdown' view helper is properly registered": function() {
      assert.isFunction(app.views.partials.$markdown);
    },
    
    "The '$markdown' view helper can be used within views": function(r) {
      assert.isTrue(r.indexOf('HTTP/1.1 200 OK') >= 0);
      
      // The <script> tag should not be present inside <p>
      assert.isTrue(r.indexOf('<p id="sanitized"></p>') >= 0);
      
      // The <script> tag should be present, since it's unsanitized
      assert.isTrue(r.indexOf('<p id="unsanitized"><script type="text/javascript" src="myscript.js">window.hackme = true;</script>\n</p>') >= 0);
    }
    
  }
  
}).export(module);