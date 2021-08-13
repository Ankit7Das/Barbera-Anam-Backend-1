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

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
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

        if(exist1.user.role === 'admin') {
            var params = {
                TableName: 'Users',
                Key: {
                    id: obj.barberId 
                }
            }
    
            try {
                var data = await documentClient.get(params).promise();

                console.log(data.Item);
    
                if(!data.Item) {
                    return {
                        statusCode: 400,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: false,
                            message: 'No such barber exists',
                        })
                    }
                } else {

                    var items = [];
    
                    if(data.Item.items) {
                        items = data.Item.items.split(',');
                        var item;
        
                        for(var i=0; i<items.length; i++) {
                            item = items[i].split('=');
        
                            if(item[0] !== '' && item[1] !== null) {
                                items[i] = {
                                    date: item[0],
                                    item: item[1],
                                    quantity: Number(item[2])
                                }
                            } else {
                                items.splice(i,1);
                            }
                        }
                    }
    
                    return {
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: true,
                            message: 'Items found',
                            data: items
                        })
                    }
                }
            } catch(err) {
                console.log("Error: ", err);
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
                };
            }
        } else if(exist1.user.role === 'barber') {

            var items = [];

            if(exist1.user.items) {
                var items = exist1.user.items.split(',');
                var item;

                for(var i=0; i<items.length; i++) {
                    item = items[i].split('=');

                    if(item[0] !== '' && item[1] !== null) {
                        items[i] = {
                            date: item[0],
                            item: item[1],
                            quantity: Number(item[2])
                        }
                    } else {
                        items.splice(i,1);
                    }
                }
            }

            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Items found',
                    data: items
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
                    message: 'Not an admin or user',
                })
            }
        }
    } catch(err) {
        console.log(err);
        return err;
    }
}