#!/usr/bin/env node

// Parses markdown syntax within JavaScript comments

var util = require('util'),
    underscore = require('underscore'),
    markdown = require('marked'),
    fs = require('fs'),
    pathModule = require('path');
    
markdown.setOptions({
  gfm: true,
  sanitize: false,
  pedantic: false
});

var tagRegex = /^(\s+)?@(.*?)$/mg;

// Prints into stdout and exits
console.exit = function() { 
  console.log(util.format.apply(null, arguments)); 
  process.exit(); 
}

function searchPattern(buffer, s) {
  var indices = {};
  if (! util.isArray(s) ) s = [s];
  for (var pat,found,idx,i=0; i < s.length; i++) {
    pat = s[i];
    found = indices[pat] = [];
    idx = buffer.indexOf(pat);
    while (idx != -1) {
      found.push(idx);
      idx = buffer.indexOf(pat, idx + 1);
    }
  }
  return indices;
}

function calcIndexes(source) {
  return searchPattern(source, '/**')['/**'];
}

// Check for arguments
if (process.argv.length != 3) console.exit("Usage: %s file.js", pathModule.basename(process.argv[1]));

var file = process.argv[2];

// Check if file exists
if (!fs.existsSync(file)) console.exit("File does not exist: %s", file);

var source = fs.readFileSync(file).toString('utf8');
var startIndexes = calcIndexes(source);
var totalComments = startIndexes.length;

// @hello

for (var idx, endIdx, chunk, repl, current=0; current < totalComments; current++) {
  idx = startIndexes[current];
  for (var i=idx; i < source.length; i++) {
    if ((source[i] == '@' && source[i+1] != '/') || (source[i] == '*' && source[i+1] == '/')) {
      endIdx = i; break;
    }
  }
  chunk = source.slice(idx, endIdx);
  repl = markdown(chunk.slice(3).trim());
  repl = '/**\n <div class="base64-encoded">' + (new Buffer(repl).toString('base64')) + '</div>\n';
  source = source.slice(0, idx) + repl + source.slice(endIdx);
  startIndexes = calcIndexes(source);
}

source = source.replace(/<code>\s+/g, '<code>');

console.log(source);

process.exit(0);
