require('dotenv').config();

var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];
        var obj = JSON.parse(event.body);
        var serviceId = obj.serviceId;
        var FLOW = obj.flow;

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

        if(exist1.user.role != 'user') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Not a user',
                })
            }
        }

        var exist2 = await serviceVerifier(serviceId);

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Service Unavailable',
                })
            }
        }
        
        var exist3 = await addedBefore(userID.id, serviceId);

        if(exist3 == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Service not in cart',
                })
            }
        }

        var params;

        if(FLOW == true) {
            params = {
                TableName: 'Carts',
                Key: {
                    userId: userID.id,
                    serviceId: serviceId,
                },
                UpdateExpression: "set #quantity=#quantity + :q",
                ExpressionAttributeNames: {
                    '#quantity': 'quantity'
                },
                ExpressionAttributeValues:{
                    ":q": 1,
                },
                ReturnValues:"UPDATED_NEW"
            };
        } else {
            params = {
                TableName: 'Carts',
                Key: {
                    userId: userID.id,
                    serviceId: serviceId,
                },
                UpdateExpression: "set #quantity=#quantity - :q",
                ExpressionAttributeNames: {
                    '#quantity': 'quantity'
                },
                ExpressionAttributeValues:{
                    ":q": 1,
                },
                ReturnValues:"UPDATED_NEW"
            };
        } 

        var data;
        var msg;

        try {
            data = await documentClient.update(params).promise();
            msg = 'Service quantity updated';

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: msg,
                })
            };
        } catch(err) {
            console.log("Error: ", err);
            msg = err;
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: msg,
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}