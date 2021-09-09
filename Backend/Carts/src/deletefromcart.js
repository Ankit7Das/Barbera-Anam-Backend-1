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

        var serviceId = event.pathParameters.serviceid;
        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];

        var temp = serviceId.split("_");
        serviceId = temp.join(" ");

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

        var info = serviceId.split(",");

        var exist2 = await serviceVerifier(info[0]);

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

        var params = {
            TableName: 'Carts',
            Key:{
                userId: userID.id,
                serviceId: serviceId
            }
        }

        var data;

        try {
            data = await documentClient.delete(params).promise();

            params = {
                TableName: 'Carts',
                KeyConditionExpression: '#user = :u',
                ExpressionAttributeValues: {
                    ':u': userID.id,
                },
                ExpressionAttributeNames: {
                    '#user': 'userId'
                }
            };
    
            
            data = await documentClient.query(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Item deleted from Cart',
                    count: data.Count
                })
            };
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