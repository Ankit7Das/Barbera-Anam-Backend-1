require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-1' });
const jwt = require("jsonwebtoken");
// const { tokenVerify } = require("./tokenVerify");
const { hashPassword, matchPassword } = require("./password");
const { JWT_SECRET } = process.env;

exports.signup = async (event) => {
    try {
        var obj = JSON.parse(event.body);

        var EMAIL = obj.email;
        var NAME = obj.name;
        var ADD = obj.address;
        var PASS = obj.password;
        var ROLE = obj.role;
        var token = event.headers.token;
        //var ID = uuid.v1();

        if(token == null) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    success: false,
                    message: "No token passed"
                })
            };
        }

        var userID;

        try {
            userID = jwt.verify(token, JWT_SECRET);
        } catch(err) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    success: false,
                    message: "Invalid Token",
                })
            };
        }

        var HASH = await hashPassword(PASS);
        
        var params = {
            TableName: 'Users',
            Key: {
                id: userID.id,
            },
            UpdateExpression: "set #name=:n, #email=:e, #address=:a, #password=:p, #role=:r",
            ExpressionAttributeNames: {
                '#name': 'name',
                '#email': 'email',
                '#address': 'address',
                '#password': 'password',
                '#role': 'role',
            },
            ExpressionAttributeValues:{
                ":n": NAME,
                ":e": EMAIL,
                ":a": ADD,
                ":p": HASH,
                ":r": ROLE,
            },
            ReturnValues:"UPDATED_NEW"
        };

        var data;
        var msg;

        try {
            data = await documentClient.update(params).promise();
            console.log("Item entered successfully:", data);
            msg = 'Item entered successfully';

            var user = {
                id: userID.id,
            }

            token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });

            var response = {
                'statusCode': 200,
                'body': JSON.stringify({
                    success: true,
                    message: msg,
                    token: token,
                })
            };
        } catch(err) {
            console.log("Error: ", err);
            msg = err;
            var response = {
                'statusCode': 500,
                'body': JSON.stringify({
                    success: false,
                    message: msg,
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }

    return response;

}

exports.loginemail = async (event) => {
    try {
        var obj = JSON.parse(event.body);

        var EMAIL = obj.email;
        
        var params = {
            TableName: 'Users',
            FilterExpression: '#email = :this_email',
            ExpressionAttributeValues: {':this_email': EMAIL},
            ExpressionAttributeNames: {'#email': 'email'}
        };

        var data;

        
        data = await documentClient.scan(params).promise();
        
        if(!data.Items[0]) {
            var response = {
                'statusCode': 404,
                'body': JSON.stringify({
                    success: false,
                    message: "User not found",
                })
            };
        } else {
            console.log("Item read successfully:", data);

            var user = {
                id: data.Items[0].id,
            }

            var token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });

            var response = {
                'statusCode': 200,
                'body': JSON.stringify({
                    success: true,
                    token: token,
                    message: "User found",
                })
            };
            
        }
    } catch(err) {
        console.log(err);
        return err;
    }

    return response;

}


exports.loginpass = async (event) => {
    try {
        var obj = JSON.parse(event.body);
        var head = event.headers;
        var PASS = obj.password;
        var token = head.token;

        if(token == null) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    success: false,
                    message: "No token passed"
                })
            };
        }

        var userID;

        try {
            userID = jwt.verify(token, JWT_SECRET);
        } catch(err) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    success: false,
                    message: "Invalid Token",
                })
            };
        }

        var params = {
            TableName: 'Users',
            Key: {
                id: userID.id,
            }
        };

        var data;

        try {
            data = await documentClient.get(params).promise();
            
            const hashedPassword = data.Item.password;
            const matchedPassword = await matchPassword(PASS, hashedPassword);

            var user = {
                id: data.Item.id,
            }

            var token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });

            if(matchedPassword) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        token: token,
                        message: "Login Success",
                    })
                };
            } else {
                return {
                    statusCode: 401,
                    body: JSON.stringify({
                        success: false,
                        err: "Incorrect password",
                    })
                };
            }

        } catch(err) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    err: "Wrong token entered"
                })
            };
        }
    } catch(err) {
        console.log(err);
        return err;
    }

}


exports.loginphone = async(event) => {
    try {
        var obj = JSON.parse(event.body);

        var PHONE = obj.phone;

        var random = Math.floor(100000 + Math.random() * 900000);

        var user = {
            phone: PHONE,
            otp: random
        }

        var token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });

        var msg = `${user.otp} is your verification code for Barbera: Salon Service at your Home.`; 

        var params = {
            Message: msg,
            PhoneNumber: '+91' + PHONE,
        };
    
        var sms = await sns.publish(params).promise();
    
        if(sms.MessageId) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    messageId: sms.MessageId,
                    token: token,
                })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    messageSuccess: false,
                })
            };
        }
    } catch(err) {
        console.log(err);
        return err;
    }

}

exports.loginotp = async (event) => {
    try {

        var obj = JSON.parse(event.body);

        var OTP = obj.otp;
        var token = event.headers.token;

        if(token == null) {
            return {
                statusCode: 401,
                body: JSON.stringify({
                    success: false,
                    message: "No token passed"
                })
            };
        }

        var userID;

        try {
            userID = jwt.verify(token, JWT_SECRET);
        } catch(err) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    success: false,
                    message: "Invalid Token",
                })
            };
        }

        if(`${userID.otp}` == OTP){

            var params = {
                TableName: 'Users',
                FilterExpression: '#phone = :this_phone',
                ExpressionAttributeValues: {':this_phone': userID.phone},
                ExpressionAttributeNames: {'#phone': 'phone'}
            };
            
            var data = await documentClient.scan(params).promise();
            var user; 
    
            if(!data.Items[0]) {
                var ID = uuid.v1();
    
                var params = {
                    TableName: 'Users',
                    Item: {
                        id: ID,
                        phone: userID.phone,
                    }
                }
    
                data = await documentClient.put(params).promise();
                console.log("User not found:", data);
    
                user = {
                    id: ID,
                }

                token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });
    
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        token: token,
                        message: 'User not found',
                        success: true, 
                    })
                };
    
            } else {
                console.log("Item read successfully:", data);
    
                user = {
                    id: data.Items[0].id,
                }
    
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        token: token,
                        message: 'User found',
                        success: true, 
                    })
                };
                
            }

        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    succes: false,
                    message: 'Wrong OTP'
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
    
}