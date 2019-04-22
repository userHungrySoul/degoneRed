
const MongoClient = require('mongodb').MongoClient;

var jwt = require('jsonwebtoken');


module.exports = {
    createUser : function(userInfo, CB){
        addUser(userInfo, CB);
    },
    getUsers : function(CB){
        getUsers(CB);
    },
    getUser : function(userInfo, CB){
        getUser(userInfo, CB);
    },
    updateUser : function(userInfo, CB){
        updateUser(userInfo, CB);
    },
    login : function(userInfo, CB){
        login(userInfo, CB);
    },
    verifyUserToken : function(userInfo, CB){
        verifyUserToken(userInfo, CB);
    }
};

function addUser(userInfo, CB){
    MongoClient.connect("mongodb://localhost:27017/MyDb", function(err, db) {
        if (err) res.send(err);
        var dbo = db.db("MyDb");
        if(userInfo.userID && userInfo.username && userInfo.password){
            dbo.collection("Users").insertOne(userInfo, function(err, result) {
                if (err) res.send(err);  
                if(result.ok){
                    CB(userInfo.username + " registered sucessfully.");
                } else {
                    CB("Registration failed, try again.");
                }
            });
        } else {
            CB("Invalid Data");
        }
        db.close();
    });
}

function getUsers(CB){
    MongoClient.connect("mongodb://localhost:27017/MyDb", function(err, db) {
        if (err) res.send(err);
        var dbo = db.db("MyDb");
        dbo.collection("Users").find({}, { projection: { _id: 1, userID: 1, username: 1 } }).toArray(function(err, result) {
            if (err) res.send(err);  
            if(result){
                CB({status:true, message:"Users details", data:result});
            } else if(result == null){
                CB({status:false, message:"No records found"});
            } else {
                CB({status:false, message:"Retriving user details failed", data:result});
            }
        });
        db.close();
    });
}


function getUser(userInfo, CB){
    MongoClient.connect("mongodb://localhost:27017/MyDb", function(err, db) {
        if (err) res.send(err);
        var dbo = db.db("MyDb");
        if(userInfo.userID || userInfo.username){
            var searchingParameter = {};
            if (userInfo.userID ){
                searchingParameter = {
                    userID:userInfo.userID
                }
            } else {
                searchingParameter = {
                    username:userInfo.username
                }
            }
            dbo.collection("Users").findOne(searchingParameter, function(err, result) {
                if (err) res.send(err);   
                if(result){
                    CB({status:true, message:"User details", data:result});
                } else if(result == null){
                    CB({status:false, message:"No records found"});
                } else {
                    CB({status:false, message:"Retriving user details failed", data:result});
                }
            });
        } else {
            CB({status:false, message:"Invalid Data"});
        }
        db.close();
    });
}

function updateUser(userInfo, CB){
    if(userInfo.userID && userInfo.username && (userInfo.newuserID || userInfo.newusername)){
        var searchingParameter = {};
        if (userInfo.userID ){
            searchingParameter = {
                userID:userInfo.userID
            }
        } else {
            searchingParameter = {
                username:userInfo.username
            }
        }
        MongoClient.connect("mongodb://localhost:27017/MyDb", function(err, db) {
            if (err) res.send(err);
            var dbo = db.db("MyDb");
            if(userInfo.newuserID && userInfo.newusername){
                var newValues = { $set: {userID: userInfo.newuserID, username: userInfo.newusername } }
            } else if(userInfo.newuserID){
                var newValues = { $set: {userID: userInfo.newuserID } }
            } else if(userInfo.newusername){
                var newValues = { $set: {username: userInfo.newusername } }
            }
            dbo.collection("Users").updateOne(searchingParameter, newValues, function(err, result) {
                if (err) res.send(err);  
                if(result){
                    CB({status:true, message:"User details updated successfully", data:newValues['$set']});
                } else if(result == null){
                    CB({status:false, message:"No records found"});
                } else {
                    CB({status:false, message:"Updating user details failed", data:result});
                }
            });
            db.close();
        });
    } else {
        CB({status:false, message:"Invalid Data"});
    }
}

function login(userInfo, CB){ // todo : add userToken
    if(userInfo.username && userInfo.password){
        var searchingParameter = {
                username:userInfo.username,
                password:userInfo.password
        };
        MongoClient.connect("mongodb://localhost:27017/MyDb", function(err, db) {
            if (err) res.send(err);
            var dbo = db.db("MyDb");
            dbo.collection("Users").findOne(searchingParameter, function(err, result) {
                if (err) res.send(err);  
                if(result){
                    delete result.password; // for security purpose
                    result.token = jwt.sign({ isTokenValid: true, userData:result}, 'secret', { expiresIn: 100 });
                    CB({status:true, message:"User login successfully", data:result});
                    console.log({status:true, message:"User login successfully", data:result});
                } else if(result == null){
                    CB({status:false, message:"Incorrect credentials"});
                    console.log({status:false, message:"Incorrect credentials"});
                } else {
                    CB({status:false, message:"Login failed", data:result});
                    console.log({status:false, message:"Login failed", data:result});
                }
            });
            db.close();
        });
    } else {
        CB({status:false, message:"Invalid Data"});
    }
}



function verifyUserToken(userInfo, CB){
    if(userInfo.userToken){
        jwt.verify(userInfo.userToken, 'secret', function(err, decoded) {
            if (err) {
                CB({status:false, isTokenValid: false,  message:"Session Expired"});
                return; // use return; because when we are inside jwt.verify(), CB() outer if() is again execute after the above call which results in multiple call exception at same time
            }
            CB({status:true, message:decoded});
        });
    } else {
        CB({status:false, message:"Invalid Data"});
    }
}