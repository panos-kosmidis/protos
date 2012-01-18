
function MainHelper(app) {

  this.hello = 99;
  
  this.url = function(title, url) {
    return title.link(url);
  }
  
}

module.exports = MainHelper;