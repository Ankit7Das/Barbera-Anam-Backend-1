require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");
const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});

exports.handler = async (event) => {
    try {

        var serviceId = event.pathParameters.serviceid;
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
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist1.user.role != 'admin') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Not an admin',
                })
            }
        }
        
        var exist2 = await serviceVerifier(serviceId);

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Service doesn\'t exist',
                    success: false,
                })
            }
        }

        if(exist2.service.icon) {
            var url = new URL(exist2.service.icon);
            var key = url.pathname.substring(1);

            try {
                await s3
                    .deleteObject({
                        Key: key,
                        Bucket: 'barbera-image'
                    })
                    .promise();
            } catch(err){
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                    })
                };
            }
        }

        var params = {
            TableName: 'Services',
            Key: {
                id: serviceId,
            }
        }

        var data;
        var msg;

        try {
            data = await documentClient.delete(params).promise();
            msg = 'Service deleted from database';

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