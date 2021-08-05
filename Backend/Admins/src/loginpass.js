require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { userVerifier } = require("./authentication");
const { matchPassword } = require('./password');
const { JWT_SECRET } = process.env;

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);

        var PASS = obj.password;
        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];

        console.log(event.headers);
        

        if(token == null) {
            return {
                statusCode: 401,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
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
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: "Invalid Token",
                })
            };
        }

        var params = {
            TableName: 'Users',
            FilterExpression: '#email = :this_email',
            ExpressionAttributeValues: {':this_email': userID.email},
            ExpressionAttributeNames: {'#email': 'email'}
        };
        
        var data = await documentClient.scan(params).promise();

        if(data.Items.lenght === 0) {
            return {
                statusCode: 500,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid token entered'
                })
            };
        } else {
            
            var match = await matchPassword(PASS, data.Items[0].password);

            if(data.Items[0].role === 'admin' && match) {
                var user = {
                    id: data.Items[0].id,
                }
    
                token = jwt.sign(user, JWT_SECRET, {});

                return {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'Login/ Signup successful',
                        token: token
                    })
                }
            } else {
                return {
                    statusCode: 400,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: false,
                        message: 'Admin acces not granted'
                    })
                };
            }

        }

    } catch(err) {
        console.log(err);
        return err;
    }
    
}