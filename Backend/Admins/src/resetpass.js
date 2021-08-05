require('dotenv').config();

var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier } = require("./authentication");
const { hashPassword, matchPassword } = require('./password');

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var NPASS = obj.newpassword;
        var OPASS = obj.oldpassword;
        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];

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

        var exist1 = await userVerifier(userID.id);

        if(exist1.success == false) {
            return {
                statusCode: 404,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist1.user.role != 'admin') {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Not an admin',
                })
            }
        }

        var match = await matchPassword(OPASS, exist1.user.password);

        if(match) {

            var HASH = await hashPassword(NPASS);

            var params = {
                TableName: 'Users',
                Key: {
                    id: userID.id
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

            var data = await documentClient.update(params).promise();
            
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Password changed',
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
                    message: 'Password mismatch',
                })
            }
        }

        params = {
            TableName: 'Stock',
            Key: {
                type: 'Distance',
                name: 'distance'
            },
            UpdateExpression: "set #distance=:d",
            ExpressionAttributeNames: {
                '#distance': 'distance', 
            },
            ExpressionAttributeValues:{
                ":d": DIST,
            },
            ReturnValues:"UPDATED_NEW"
        }

        try {
            data = await documentClient.update(params).promise();

            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Booking Radius updated',
                })
            }

        } catch(err) {
            return {
                statusCode: 500,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: err,
                })
            }
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}