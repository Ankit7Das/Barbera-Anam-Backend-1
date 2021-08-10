require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var https = require('https');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];
        var obj = JSON.parse(event.body);
        var barberId = obj.barberId;
        var serviceId = obj.serviceId;

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

        var random = Math.floor(100000 + Math.random() * 900000);

        var msg = `${random}`;

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
            const reqBody = '{"to":"/topics/' + exist1.user.phone + '", "priority": "high", "notification": {"title": "Barbera Home Salon", "body":"' + msg + '"}}';
            console.log(reqBody);
        
            req.write(reqBody);
            req.end();
            
        });

        console.log(fcmnotif);

        var params;
        var data;
        var flag = true;

        for(var i=0; i<serviceId.length; i++) {
            params = {
                TableName: 'Bookings',
                Key: {
                    userId: userID.id,
                    serviceId: serviceId[i]
                }
            }

            data = await documentClient.get(params).promise();

            if(!data.Item) {
                flag = false;
                break;
            }
        }

        if(!flag) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Wrong service ids entered'
                })
            };
        }

        for(var i=0; i<serviceId.length; i++) {
            params = {
                TableName: 'Bookings',
                Key: {
                    userId: userID.id,
                    serviceId: serviceId[i]
                },
                UpdateExpression: "set #end_serv_otp=:e",
                ExpressionAttributeNames: { 
                    '#end_serv_otp': 'end_serv_otp'
                },
                ExpressionAttributeValues:{
                    ":e": String(random)
                },
                ReturnValues:"UPDATED_NEW"
            }

            data = await documentClient.update(params).promise();
        }
    
        random = null;

        if(fcmnotif === "success") {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Notif otp sent',
                    notif_status: fcmnotif,
                })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Otp not sent'
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}