
function BlogHelper() {
  
  this.blogVar = 'COOL';
  
  this.publish = function(title) {
    return "<h1>" + title + "</h1>";
  }
  
}

module.exports = BlogHelper;