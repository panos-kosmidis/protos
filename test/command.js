
require('../lib/extensions.js');

var fs = require('fs'),
    cp = require('child_process'),
    vows = require('vows'),
    assert = require('assert'),
    pathModule = require('path'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;

var cwd = process.cwd(),
    tmp = pathModule.resolve('./test/fixtures/tmp');

var skeleton = fs.readdirSync(cwd + '/skeleton/');
var prefix = '../../../';

var corejs = new Multi({
  command: function(str, callback) {
    cp.exec(util.format(prefix + 'bin/corejs %s', str), function(err, stdout, stderr) {
      if (err) callback(err, stderr.trim());
      else callback(null, stdout.trim());
    });
  }
});

vows.describe('Command Line Interface').addBatch({
  
  'Preliminaries': {
    
    topic: function() {
      var promise = new EventEmitter();
      process.chdir('test/fixtures');
      cp.exec('rm -Rf tmp', function(err, stdout, stderr) {
        fs.mkdirSync('tmp');
        process.chdir('tmp');
        promise.emit('success', process.cwd());
      });
      return promise;
    },
    
    "Created temp directory": function(cwd) {
      assert.strictEqual(tmp, cwd);
    }
    
  }
  
}).addBatch({
  
  'corejs create': {
    
    topic: function() {
      var promise = new EventEmitter(),
          results = [];
      
      corejs.command('create myapp --domain corejs.org --js jquery prototype --css bootstrap --model posts comment --controller admin dashboard');
      corejs.command('create myapp1 --mustache --controller test');
      
      corejs.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Creates application skeleton": function(results) {
      var r1 = results[0], 
          r2 = results[1];
      var expected = '» Successfully created myapp\n» Created myapp/app/models/posts.js\n» \
Created myapp/app/models/comments.js\n» Created myapp/app/controllers/admin.js\n» \
Created myapp/app/controllers/dashboard.js\n» Created myapp/app/helpers/admin.js\n» \
Created myapp/app/helpers/dashboard.js\n» Created myapp/app/views/admin/admin-index.html\n» \
Created myapp/app/views/dashboard/dashboard-index.html\n» \
Downloading Bootstrap CSS Toolkit from Twitter\n» \
Downloading jQuery JavaScript Library\n» \
Downloading Prototype JavaScript Framework';

      assert.equal(r1, expected);
      assert.deepEqual(fs.readdirSync('myapp'), skeleton);
      
      expected = '» Successfully created myapp1\n» Created myapp1/app/controllers/test.js\n» \
Created myapp1/app/helpers/test.js\n» Created myapp1/app/views/main/main-index.mustache\n» \
Created myapp1/app/views/test/test-index.mustache';
      
      assert.equal(r2, expected);
      assert.deepEqual(fs.readdirSync('myapp1'), skeleton);

    },
    
    "Creates .mustache templates when specified": function() {
      assert.isFalse(pathModule.existsSync('myapp1/app/views/main/main-index.html'));
      assert.isTrue(pathModule.existsSync('myapp1/app/views/main/main-index.mustache'));
      assert.isTrue(pathModule.existsSync('myapp1/app/views/test/test-index.mustache'));
    },
    
    "Downloads assets & libraries": function() {
      assert.isTrue(pathModule.existsSync('myapp/public/js/jquery-1.7.1.min.js'));
      assert.isTrue(pathModule.existsSync('myapp/public/js/prototype.js'));
      assert.isTrue(pathModule.existsSync('myapp/public/css/bootstrap/css/bootstrap-responsive.css'));
    },
    
    "Creates models": function() {
      assert.isTrue(pathModule.existsSync('myapp/app/models/posts.js'));
      assert.isTrue(pathModule.existsSync('myapp/app/models/comments.js'));
    },
    
    "Creates controllers": function() {
      assert.isTrue(pathModule.existsSync('myapp/app/controllers/admin.js'));
      assert.isTrue(pathModule.existsSync('myapp/app/controllers/dashboard.js'));
    },
    
    "Creates helpers": function() {
      assert.isTrue(pathModule.existsSync('myapp/app/helpers/admin.js'));
      assert.isTrue(pathModule.existsSync('myapp/app/helpers/dashboard.js'));
    },
    
    "Creates views": function() {
      assert.isTrue(pathModule.existsSync('myapp/app/views/admin/admin-index.html'));
      assert.isTrue(pathModule.existsSync('myapp/app/views/dashboard/dashboard-index.html'));
    }
    
  }
  
}).addBatch({
  
  'corejs controller': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      process.chdir('myapp1');
      prefix += '../';
      corejs.command('controller blog admin');
      corejs.command('controller cool --nohelper');
      
      corejs.exec(function(err, results) {
        promise.emit('success', err || results);
      });
      
      return promise;
    },
    
    "Properly generates controllers": function(results) {
      var r1 = results[0];
      var expected =  '» Created myapp1/app/controllers/blog.js\n» Created myapp1/app/controllers/admin.js\n» \
Created myapp1/app/helpers/blog.js\n» Created myapp1/app/helpers/admin.js\n» \
Created myapp1/app/views/blog/blog-index.html\n» Created myapp1/app/views/admin/admin-index.html';

      assert.equal(r1, expected);
      assert.isTrue(pathModule.existsSync('app/controllers/blog.js'));
      assert.isTrue(pathModule.existsSync('app/controllers/admin.js'));
      assert.isTrue(pathModule.existsSync('app/helpers/blog.js'));
      assert.isTrue(pathModule.existsSync('app/helpers/admin.js'));
      assert.isTrue(pathModule.existsSync('app/views/blog/blog-index.html'));
      assert.isTrue(pathModule.existsSync('app/views/admin/admin-index.html'));
      
    },
    
    "Skips helpers when using --nohelper": function(results) {
      var r1 = results[1];
      var expected = '» Created myapp1/app/controllers/cool.js\n» Created myapp1/app/views/cool/cool-index.html';
      
      assert.equal(r1, expected);
      assert.isTrue(pathModule.existsSync('app/controllers/cool.js'));
      assert.isFalse(pathModule.existsSync('app/helpers/cool.js'));
      assert.isTrue(pathModule.existsSync('app/views/cool/cool-index.html'));
      
    }
    
  }
  
}).addBatch({
  
    'corejs model': {

      topic: function() {
        var promise = new EventEmitter();

        corejs.command('model posts comments');

        corejs.exec(function(err, results) {
          promise.emit('success', err || results);
        });

        return promise;
      },

      "Properly generates models": function(results) {
        var r1 = results[0];
        var expected =  '» Created myapp1/app/models/posts.js\n» Created myapp1/app/models/comments.js';

        assert.equal(r1, expected);
        assert.isTrue(pathModule.existsSync('app/models/posts.js'));
        assert.isTrue(pathModule.existsSync('app/models/comments.js'));

      }

    }
  
}).addBatch({
  
  'corejs helper': {

    topic: function() {
      var promise = new EventEmitter();

      corejs.command('helper helper1 helper2');

      corejs.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Properly generates helpers": function(results) {
      var r1 = results[0];
      var expected =  '» Created myapp1/app/helpers/helper1.js\n» Created myapp1/app/helpers/helper2.js';

      assert.equal(r1, expected);
      assert.isTrue(pathModule.existsSync('app/helpers/helper1.js'));
      assert.isTrue(pathModule.existsSync('app/helpers/helper2.js'));

    }

  }
  
}).addBatch({
  
  'corejs view': {

    topic: function() {
      var promise = new EventEmitter();

      corejs.command('view main/info blog/post admin/settings');
      corejs.command('view main/m1 blog/m2 admin/m3 --ext eco.html');

      corejs.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Properly generates views": function(results) {
      var r1 = results[0];
      var expected =  '» Created myapp1/app/views/main/main-info.html\n» Created myapp1/app/views/blog/blog-post.html\n» \
Created myapp1/app/views/admin/admin-settings.html';

      assert.equal(r1, expected);
      assert.isTrue(pathModule.existsSync('app/views/main/main-info.html'));
      assert.isTrue(pathModule.existsSync('app/views/blog/blog-post.html'));
      assert.isTrue(pathModule.existsSync('app/views/admin/admin-settings.html'));
    },
    
    "Uses custom extensions when using --ext": function(results) {
      var r2 = results[1];
      var expected =  '» Created myapp1/app/views/main/main-m1.eco.html\n» \
Created myapp1/app/views/blog/blog-m2.eco.html\n» Created myapp1/app/views/admin/admin-m3.eco.html';

      assert.equal(r2, expected);
      assert.isTrue(pathModule.existsSync('app/views/main/main-m1.eco.html'));
      assert.isTrue(pathModule.existsSync('app/views/blog/blog-m2.eco.html'));
      assert.isTrue(pathModule.existsSync('app/views/admin/admin-m3.eco.html'));
    }

  }
  
}).addBatch({
  
    'corejs partial': {

      topic: function() {
        var promise = new EventEmitter();

        corejs.command('partial blog/post admin/widget');
        corejs.command('partial blog/post admin/widget --ext coffee');

        corejs.exec(function(err, results) {
          promise.emit('success', err || results);
        });

        return promise;
      },

      "Properly generates view partials": function(results) {
        var r1 = results[0];
        var expected =  '» Created myapp1/app/views/blog/_post.html\n» Created myapp1/app/views/admin/_widget.html';

        assert.equal(r1, expected);
        assert.isTrue(pathModule.existsSync('app/views/blog/_post.html'));
        assert.isTrue(pathModule.existsSync('app/views/admin/_widget.html'));
      },

      "Uses custom extensions when using --ext": function(results) {
        var r2 = results[1];
        var expected =  '» Created myapp1/app/views/blog/_post.coffee\n» Created myapp1/app/views/admin/_widget.coffee';

        assert.equal(r2, expected);
        assert.isTrue(pathModule.existsSync('app/views/blog/_post.coffee'));
        assert.isTrue(pathModule.existsSync('app/views/admin/_widget.coffee'));
      }

    }
  
}).addBatch({
  
  'corejs static': {

    topic: function() {
      var promise = new EventEmitter();

      corejs.command('static hello world');
      corejs.command('static about contact --ext jade');

      corejs.exec(function(err, results) {
        promise.emit('success', err || results);
      });

      return promise;
    },

    "Properly generates static views": function(results) {
      var r1 = results[0];
      var expected = '» Created myapp1/app/views/__static/hello.html\n» Created myapp1/app/views/__static/world.html';
      assert.equal(r1, expected);
      assert.isTrue(pathModule.existsSync('app/views/__static/hello.html'));
      assert.isTrue(pathModule.existsSync('app/views/__static/world.html'));
    },

    "Uses custom extensions when using --ext": function(results) {
      var r2 = results[1];
      var expected = '» Created myapp1/app/views/__static/about.jade\n» Created myapp1/app/views/__static/contact.jade';
      
      assert.equal(r2, expected);
      assert.isTrue(pathModule.existsSync('app/views/__static/about.jade'));
      assert.isTrue(pathModule.existsSync('app/views/__static/contact.jade'));
    }

  }
  
}).addBatch({
  
  'Cleanup': {
    
    topic: function() {
      var promise = new EventEmitter();

      process.chdir('../');
      cp.exec('rm -Rf myapp myapp1', function(err, stdout, stderr) {
        promise.emit('success', err);
      });

      return promise;
    },

    "Removed test applications": function(err) {
      assert.isNull(err);
    }
    
  }
  
}).export(module);
