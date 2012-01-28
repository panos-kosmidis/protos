
function MainHelper(app) {

  this.helperProperty = '99';

  this.link = function(title, url) {
    return title.link(url);
  }
  
  this.jazz_link = function(title, url, callback) {
    callback(title.link(url));
  }
  
  this.kernel_link = function(title, url, callback) {
    callback(null, title.link(url));
  }
  
}

module.exports = MainHelper;