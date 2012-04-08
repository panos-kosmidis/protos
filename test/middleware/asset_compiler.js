
var app = require('../fixtures/bootstrap'),
    fs = require('fs'),
    vows = require('vows'),
    assert = require('assert'),
    util = require('util'),
    Multi = require('multi'),
    EventEmitter = require('events').EventEmitter;
    
var multi = new Multi(app);

var compiledLess, compiledStylus, compiledCoffee;

vows.describe('Asset Compiler (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      var promise = new EventEmitter();
      
      // Restore modified file before starting tests
      var restore = fs.readFileSync(app.fullPath('../stylus.styl.orig'), 'utf8');
      fs.writeFileSync(app.fullPath('public/assets/stylus.styl'), restore, 'utf8');
      
      // Load dependencies
      if (!app.supports.static_server) app.use('static_server');
      
      if (!app.supports.asset_compiler) app.use('asset_compiler', {
        watchOn: [protos.environment],
        minify: {
          'assets/min.css': ['target.css', 'assets/target.less'],
          'assets/min.js': ['target.js', 'assets/target.coffee']
        }
      });
     
      // Get pre-compiled files for comparison
      compiledLess = fs.readFileSync(app.fullPath('../compiled-assets/less.txt'), 'utf8');
      compiledStylus = fs.readFileSync(app.fullPath('../compiled-assets/stylus.txt'), 'utf8');
      compiledStylusModified = fs.readFileSync(app.fullPath('../compiled-assets/stylus2.txt'), 'utf8');
      compiledCoffee = fs.readFileSync(app.fullPath('../compiled-assets/coffee.txt'), 'utf8');
     
      // Forbids access to asset sources
      multi.curl('-i /assets/less.less');
      multi.curl('-i /assets/stylus.styl');
      multi.curl('-i /assets/coffee.coffee');
      
      // Successfully compiles LESS assets
      multi.curl('/assets/less.css');
      
      // Successfully compiles Stylus assets
      multi.curl('/assets/stylus.css');
      
      // Successfully compiles CoffeeScript assets
      multi.curl('/assets/coffee.js');
      
      // Properly minifies supported assets
      multi.curl('/assets/min.css');
      multi.curl('/assets/min.js');
      
      // Blocks access to minify sources
      multi.curl('-i /target.css');
      multi.curl('-i /target.js');
      
      multi.exec(function(err, results) {
        var p = app.fullPath('public/assets/stylus.styl');
        fs.readFile(p, 'utf8', function(err, styl) {
          if (err) promise.emit('success', err);
          else {
            styl = styl.replace('border-radius(5px)', 'border-radius(100px)');
            
            if (app.environment != 'travis') {
              
              // Prepare for the change event
              app.on('compile: public/assets/stylus.css', function(err, code) {
                if (err) promise.emit('success', err);
                else {
                  delete app.supports.static_server;
                  results.push(err || code);
                  promise.emit('success', err || results);
                }
              });

              // Write file
              fs.writeFileSync(p, styl, 'utf8');

            } else {
              
              promise.emit('success', err || results);
              
            }

          }
        });
      });
     
      return promise;
    },
    
    "Forbids access to asset sources": function(results) {
      var r1 = results[0],
          r2 = results[1],
          r3 = results[2];
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r3.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    "Successfully compiles LESS assets": function(results) {
      var r = results[3];
      assert.equal(r, compiledLess);
    },
    
    "Successfully compiles Stylus assets": function(results) {
      var r = results[4];
      assert.equal(r, compiledStylus);
    },
    
    "Successfully compiles CoffeeScript assets": function(results) {
      var r = results[5];
      assert.equal(r, compiledCoffee);
    },
    
    "Successfully minifies supported assets": function(results) {
      var r1 = results[6],
          r2 = results[7];
      var expected1 = '#features #toc-sidebar{display:none!important}#toc-sidebar{overflow-y:scroll;box-shadow:5px 0 40px \
rgba(255,255,255,.8);position:fixed;top:0;left:0;height:100%;background:#f2f2f2 repeat}#toc-sidebar>:first-child{margin:50px \
0 100px 20px;padding:0}#toc-sidebar ul{width:250px}#toc-sidebar ul li{list-style:none}#toc-sidebar ul li a{font-size:12px;\
color:#222}#toc-sidebar ul li.section{margin-top:.5em}#toc-sidebar ul li.section a{font-weight:700}#toc-sidebar ul \
li.sub{margin-left:0}#yelow #short{color:#fea}#yelow #long{color:#fea}#yelow #rgba{color:rgba(255,238,170,.1)}#yelow \
#argb{color:#1affeeaa}';
      var expected2 = '(function(){var a,b,c,d,e,f,g,h,i=Array.prototype.slice;e=42,f=!0,f&&(e=-42),h=function(a){return a*a}\
,b=[1,2,3,4,5],c={root:Math.sqrt,square:h,cube:function(a){return a*h(a)}},g=function(){var a,b;return b=arguments[0],a=2<=\
arguments.length?i.call(arguments,1):[],print(b,a)},typeof elvis!="undefined"&&elvis!==null&&alert("I knew it!"),a=function()\
{var a,e,f;f=[];for(a=0,e=b.length;a<e;a++)d=b[a],f.push(c.cube(d));return f}()}).call(this),function(){var a,b,c,d;d=["do",\
"re","mi","fa","so"],c={Jagger:"Rock",Elvis:"Roll"},a=[1,0,1,0,0,1,1,1,0],b={brother:{name:"Max",age:11},sister:{name:"Ida",\
age:9}}}.call(this)';
      assert.equal(r1, expected1);
      assert.equal(r2, expected2);
    },
    
    "Blocks access to minify sources": function(results) {
      var r1 = results[8],
          r2 = results[9];
      assert.isTrue(r1.indexOf('HTTP/1.1 404 Not Found') >= 0);
      assert.isTrue(r2.indexOf('HTTP/1.1 404 Not Found') >= 0);
    },
    
    "Watches for source file changes (when enabled)": function(results) {
      // Note: Due to the heavy disk i/o from the travis testing environment,
      // this test is not considered. For example, the compile event is never
      // fired, which is somehow related to the operating system's load.
      // 
      // This means, that the fs.Watcher instance does not know if/when the file
      // has been changed, which makes makes it impossible to verify if the file
      // has been compiled after changes have been comitted into the asset's source.
      if (app.environment != 'travis') {
        var r = results[10];
        assert.equal(r, compiledStylusModified);
      }
    }
    
  }
  
}).export(module);