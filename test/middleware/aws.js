
var app = require('../fixtures/bootstrap'),
    vows = require('vows'),
    assert = require('assert');
    
vows.describe('Amazon Web Services (middleware)').addBatch({
  
  '': {
    
    topic: function() {
      
      app.use('aws', {
        accessKey: 'username',
        secretKey: 'password',
        clients: {
          thumbs: {
            type: 's3',
            setBucket: 'my.cool.bucket',
          },
          cloud: {
            type: 'ec2',
            setRegion: 'ap-southeast-1'
          }
        }
      });
      
      return app.aws;
    },
    
    'Properly sets clients': function(aws) {
      assert.deepEqual(Object.keys(aws), ['thumbs', 'cloud']);
      assert.isTrue('thumbs' in aws);
      assert.isTrue('cloud' in aws);
    },
    
    'Properly configures clients': function(aws) {
      assert.equal(aws.thumbs.getEndPoint(), 'my.cool.bucket.s3.amazonaws.com');
      assert.equal(aws.cloud.getEndPoint(), 'ec2.ap-southeast-1.amazonaws.com');
    }
    
  }
  
}).export(module);
