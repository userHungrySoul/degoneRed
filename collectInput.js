module.exports = extractInputs;

function extractInputs(req, callback){
    var body = '';
    req.on('data', function(chunk) {
      body += chunk;
    });
    req.on('end', function() {
      var data = JSON.parse(body);
      callback(data);
    });
  }