
function ProductsModel(app) {
  
  this.driver = 'mongodb';
  
  this.properties = {
    name: {type: 'string', required: true},
    price: {type: 'float', required: true, default: 0.0}
  }
  
}

module.exports = ProductsModel;