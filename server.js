//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
var jwt = require('jsonwebtoken');

var collectInputs = require('./collectInput');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
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
  if (!db) {
    initDb(function(err){});
  }
  var col = db.collection('counts').find();
  var response = {
    mongoURL:mongoURL,
    col:col,
    dbDetails:dbDetails
  }
  res.send({message:'Test Completed', data:response});
});

// User Management - Begin

app.post('/registerUser', (req, res) => {
	collectInputs(req, function callback(inputs){
		Users.createUser(inputs, (CB)=>{
			res.send(CB);
		});
	});
});

app.post('/addUser', (req, res) => {
	if (!db) {
	    initDb(function(err){});
	  }
	res.setHeader('Access-Control-Allow-Origin', '*');
	if (db) {
		collectInputs(req, function callback(inputs){
			if(inputs.userID && inputs.username && inputs.password){
				db.collection("Users").insertOne(inputs, function(err, result) {
					if (err) res.send({status:false,message:"insersion failed, try again.", data:err});  
					if(result){
					    res.send({status:true, message: inputs.username + " registered sucessfully.", inputs:inputs, data:result});
					} else {
					    res.send({status:false, message: "Registration failed, try again.", inputs:inputs, data:result});
					}
				});
			} else {
				inputs.password = null;
			    res.send({status:false, message: "Invalid Inputs", inputs:inputs});
			}
		});
	} else {
		res.send({status:false, message:"db init failed, try again."});
	}
});

app.post('/getUsers', (req, res) => {
	if (!db) {
	    initDb(function(err){});
	  }
	res.setHeader('Access-Control-Allow-Origin', '*');
	if (db) {
		collectInputs(req, function callback(inputs){
			db.collection("Users").find({}, { projection: { _id: 1, userID: 1, username: 1 } }).toArray(function(err, result) {
			    if (err) res.send(err);  
			    if(result){
				res.send({status:true, message:"Users details", data:result});
			    } else if(result == null){
				res.send({status:false, message:"No records found"});
			    } else {
				res.send({status:false, message:"Retriving user details failed", data:result});
			    }
			});
		});
	} else {
		res.send({status:false, message:"db init failed, try again."});
	}	
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
	if (!db) {
	    initDb(function(err){});
	  }
	res.setHeader('Access-Control-Allow-Origin', '*');
	if (db) {
		collectInputs(req, function callback(userInfo){
			if(userInfo.username && userInfo.password){
				 var searchingParameter = {
					username:userInfo.username,
					password:userInfo.password
				};
				db.collection("Users").findOne(searchingParameter, function(err, result) {
					if (err) res.send(err);  
					if(result){
					    delete result.password; // for security purpose
					    result.token = jwt.sign({ isTokenValid: true, userData:result}, 'secret', { expiresIn: 100 });
					    res.send({status:true, message:"User login successfully", data:result});
					} else if(result == null){
					    res.send({status:false, message:"Incorrect credentials"});
					} else {
					    res.send({status:false, message:"Login failed", data:result});
					}
				    });
			    } else {
				res.send({status:false, message:"Invalid Data"});
			    }
		});
	} else {
		res.send({status:false, message:"db init failed, try again."});
	}
});

app.post('/verifyUserToken', (req, res) => {
	if (!db) {
	    initDb(function(err){});
	  }
	res.setHeader('Access-Control-Allow-Origin', '*');
	if (db) {
		collectInputs(req, function callback(userInfo){
			if(userInfo.userToken){
				jwt.verify(userInfo.userToken, 'secret', function(err, decoded) {
				    if (err) {
					res.send({status:false, isTokenValid: false,  message:"Session Expired"});
					return; // use return; because when we are inside jwt.verify(), CB() outer if() is again execute after the above call which results in multiple call exception at same time
				    }
				    res.send({status:true, message:decoded});
				});
			    } else {
				res.send({status:false, message:"Invalid Data"});
			    }
		});
	} else {
		res.send({status:false, message:"db init failed, try again."});
	}
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
