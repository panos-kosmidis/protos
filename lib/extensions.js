
/* Extensions to the JavaScript Objects */

// Allow console to print & inspect data, then exit
console.exit = function(msg) {
  if (typeof msg == 'string') console.log(msg);
  else console.dir(msg);
  process.exit();
}