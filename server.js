//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];

  // If using env vars from secret from service binding  
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split("//");
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(":");
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

app.get('/test', function (req, res) {
  // var mongodb = require('mongodb');
  // mongodb.connect(mongoURL, function(err, conn) {
  //   if (err) {
  //     callback(err);
  //     return;
  //   }

  //   db = conn;
  //   dbDetails.databaseName = db.databaseName;
  //   dbDetails.url = mongoURLLabel;
  //   dbDetails.type = 'MongoDB';

  //   console.log('Connected to MongoDB at: %s', mongoURL);
  // });
  if (!db) {
    initDb(function(err){});
  }
  var col = db.collection('counts').find();
  var response = {
    mongoURL:mongoURL,
    processenv : process.env,
    col:col
  }
  res.send({message:'Test Completed', data:dbDetails});
});

// User Management - Begin

app.post('/registerUser', (req, res) => {
	collectInputs(req, function callback(inputs){
		Users.createUser(inputs, (CB)=>{
			res.send(CB);
		});
	});
});

app.post('/getUsers', (req, res) => {
		Users.getUsers((CB)=>{
			res.send(CB);
		});
});

app.post('/getUser', (req, res) => {
	collectInputs(req, function callback(inputs){
		Users.getUser(inputs, (CB)=>{
			res.send(CB);
		});
	});
});

app.post('/updateUser', (req, res) => {
	collectInputs(req, function callback(inputs){
		Users.updateUser(inputs, (CB)=>{
			res.send(CB);
		});
	});
});

app.post('/login', (req, res) => {
	collectInputs(req, function callback(inputs){
		Users.login(inputs, (CB)=>{
			res.send(CB);
		});
	});
});

app.post('/verifyUserToken', (req, res) => {
	collectInputs(req, function callback(inputs){
		Users.verifyUserToken(inputs, (CB)=>{
			res.send(CB);
		});
	});
});

// User Management - End



// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send({message:"something bad happened!", data:err});
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
