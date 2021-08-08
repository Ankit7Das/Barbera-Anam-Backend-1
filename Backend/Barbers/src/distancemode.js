require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var https = require('https');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var MODE = 'start';
        var userId = obj.userId;
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

        var exist2 = await userVerifier(userId);

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist2.user.role != 'user') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Not an user',
                })
            }
        }

        var params = {
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

        try {
            var data = await documentClient.update(params).promise();

            var msg = `Barber has left for your location, he/she will reach there shortly.`;

            var fcmnotif = await new Promise((resolve, reject) => {
                const options = {
                    host: 'fcm.googleapis.com',
                    path: '/fcm/send',
                    method: 'POST',
                    headers: {
                        'Authorization': 'key=' + process.env.FCM_AUTH,
                        'Content-Type': 'application/json',
                    },
                };
            
                console.log(options);
                const req = https.request(options, (res) => {
                    console.log('success');
                    console.log(res.statusCode);
                    resolve('success');
                });
            
                req.on('error', (e) => {
                    console.log('failure' + e.message);
                    reject(e.message);
                });
            
                // const reqBody = '{"to":"' + deviceToken + '", "priority" : "high"}';
                const reqBody = '{"to":"/topics/' + exist2.user.phone + '", "priority": "high", "notification": {"title": "Barbera Home Salon", "body":"' + msg + '"}}';
                console.log(reqBody);
            
                req.write(reqBody);
                req.end();
                
            });

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