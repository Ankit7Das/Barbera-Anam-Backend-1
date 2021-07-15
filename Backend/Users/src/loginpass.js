require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { userVerifier } = require("./authentication");
const { hashPassword, matchPassword } = require('./password');
const { JWT_SECRET } = process.env;

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);

        var PASS = obj.password;
        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];
        

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

        if(!userID.id) {
            var params = {
                TableName: 'Users',
                FilterExpression: '#phone = :this_phone',
                ExpressionAttributeValues: {':this_phone': userID.phone},
                ExpressionAttributeNames: {'#phone': 'phone'}
            };
            
            var data = await documentClient.scan(params).promise();

            console.log(data);

            if(data.Items.length === 0) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'User not found'
                    })
                };
            } else {
                var CHECK = await matchPassword(PASS,data.Items[0].password);

                console.log(CHECK);

                if(CHECK) {
                    var user = {
                        id: data.Items[0].id,
                    }

                    console.log(user);
        
                    token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });

                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            success: true,
                            message: 'Login Successful',
                            token: token
                        })
                    };
                } else {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Password does not match'
                        })
                    };
                }
            }
        } else {
            var exist1 = await userVerifier(userID.id);

            if(exist1.success === false) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'User not found'
                    })
                };
            }else {
                var HASH = await hashPassword(PASS);

                var params = {
                    TableName: 'Users',
                    Key: {
                        id: userID.id,
                    },
                    UpdateExpression: "set #password=:p",
                    ExpressionAttributeNames: {
                        '#password': 'password', 
                    },
                    ExpressionAttributeValues:{
                        ":p": HASH,
                    },
                    ReturnValues:"UPDATED_NEW"
                }
        
                try {
                    var data = await documentClient.update(params).promise();
        
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            success: true,
                            message: 'Password added',
                        })
                    }
                } catch(err) {
                    console.log("Error: ", err);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({
                            success: false,
                            message: err,
                        })
                    };
                }
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
    
}