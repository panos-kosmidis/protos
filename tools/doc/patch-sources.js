#!/usr/bin/env node

// Patches the yuidoc sources to have self-contained code

require('../../lib/extensions.js');

var fs = require('fs');

var jsHtml = /\.js\.html$/;
var moduleHtml = /&gt; <a href="(.*?)" title="(.*?)">(.*?)<\/a>/; // &gt; <a href="./module_lib.html" title="lib">lib</a>

var sToken = '<div class="highlight"><pre>';
var eToken = '</div>\n\n                    </div>\n			</div>\n		</div>\n		<div class="yui-b">';

fs.readdirSync('docs/').forEach(function(file) {
  if (jsHtml.test(file)) {
    var source = fs.readFileSync('docs/' + file).toString('utf8');
    var matches = source.match(moduleHtml);
    var module = matches[2];
    var origSrc = fs.readFileSync(module + '/' + file.replace('.html', '')).toString('utf8');
    var leftSrc = source.slice(0, source.indexOf(sToken) + sToken.length) + '<pre class="brush: js">';
    var rightSrc = '</pre><!-- .brush: js -->\n' + source.slice(source.indexOf(eToken));
    var html = leftSrc + origSrc.replace(/<pre>/g, '') + rightSrc;
    fs.writeFileSync('docs/' + file, html, 'utf8');
    console.log('INFO:  patched docs/' + file);
  }
});
