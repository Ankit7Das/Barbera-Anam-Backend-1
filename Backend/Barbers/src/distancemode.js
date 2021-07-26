require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var MODE = obj.mode;
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

        var exist1 = await userVerifier(userID.id);

        if(exist1.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist1.user.role != 'barber') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Not an barber',
                })
            }
        }

        var params;

        if (MODE === 'start') {

            params = {
                TableName: 'Users',
                Key: {
                    id: exist1.user.id,
                },
                UpdateExpression: "set #mode=:m",
                ExpressionAttributeNames: {
                    '#mode': 'mode', 
                },
                ExpressionAttributeValues:{
                    ":m": MODE,
                },
                ReturnValues:"UPDATED_NEW"
            }

        } else if (MODE === 'end') {
            
            params = {
                TableName: 'Users',
                Key: {
                    id: exist1.user.id,
                },
                UpdateExpression: "set #mode=:m",
                ExpressionAttributeNames: {
                    '#mode': 'mode', 
                },
                ExpressionAttributeValues:{
                    ":m": MODE,
                },
                ReturnValues:"UPDATED_NEW"
            }

        }

        try {
            var data = await documentClient.update(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Barber mode updated',
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

    } catch(err) {
        console.log(err);
        return err;
    }
}