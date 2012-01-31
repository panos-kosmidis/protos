
function BlogController(app) {
  
  get('/', function(req, res) {
    res.end('{BLOG CONTROLLER /}');
  });
  
}

module.exports = BlogController;