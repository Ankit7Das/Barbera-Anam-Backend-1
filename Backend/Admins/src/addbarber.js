require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
var nodemailer = require('nodemailer');
const { userVerifier } = require("./authentication");
const { passwordGenerator, hashPassword } = require('./password');

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var PHONE = obj.phone;
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

        var params = {
            TableName: 'Users',
            FilterExpression: '#phone = :this_phone',
            ExpressionAttributeValues: {':this_phone': PHONE},
            ExpressionAttributeNames: {'#phone': 'phone'},
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length === 0) {
            params = {
                TableName: 'Users',
                Item: {
                    id: uuid.v1(),
                    phone: PHONE,
                    role: 'barber',
                    email: ''
                }
            }
        
            try {
                data = await documentClient.put(params).promise();

                console.log(data);

                return {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'Barber added',
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
        } else {
            console.log("outside");
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'User with this phone number already exists',
                })
            }
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}