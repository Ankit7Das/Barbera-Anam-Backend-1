require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var https = require('https');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { userVerifier } = require("./authentication");
const { JWT_SECRET } = process.env;


exports.handler = async(event) => {
    try {
        console.log(event);
        var obj = JSON.parse(event.body);

        var PHONE = obj.phone;
        var MODE = obj.mode;

        var params = {
            TableName: 'Users',
            FilterExpression: '#phone = :this_phone',
            ExpressionAttributeValues: {':this_phone': PHONE},
            ExpressionAttributeNames: {'#phone': 'phone'}
        };
        
        var data = await documentClient.scan(params).promise();
        var random = Math.floor(100000 + Math.random() * 900000);
        var time;

        if(data.Items.length == 0) {
            var code;
            var data1;
            time = 'first';

            do {
                code = Math.round((Math.pow(36, 6 + 1) - Math.random() * Math.pow(36, 6))).toString(36).slice(1);

                params = {
                    TableName: 'Users',
                    FilterExpression: '#referral = :this_referral',
                    ExpressionAttributeValues: {':this_referral': code},
                    ExpressionAttributeNames: {'#referral': 'referral'}
                };

                data1 = await documentClient.scan(params).promise();
            }
            while(data1.Count != 0);

            var ID = uuid.v1();

            params = {
                TableName: 'Users',
                Item: {
                    id: ID,
                    phone: PHONE,
                    otp: random,
                    referral: code,
                    invites: 0
                }
            }

            try {
                data = await documentClient.put(params).promise();

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
                };
            }

        } else {
            time = 'not first';

            params = {
                TableName: 'Users',
                Key: {
                    id: data.Items[0].id,
                },
                UpdateExpression: "set #otp=:o ",
                ExpressionAttributeNames: {
                    '#otp': 'otp',
                },
                ExpressionAttributeValues:{
                    ":o": random,
                },
                ReturnValues:"UPDATED_NEW"
            };
    
            try {
                data = await documentClient.update(params).promise();
            } catch(err) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        success: false,
                        message: err,
                    })
                };
            }
            
        }

        var user = {
            phone: PHONE,
        }

        var token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });

        var msg = `${random} is your verification code for Barbera: Salon Service at your Home.`;

        random = null; 

        if(time === 'first' || MODE === 'web') {
            params = {
                Message: msg,
                PhoneNumber: '+91' + PHONE,
            };
        
            var sms = await sns.publish(params).promise();
        
            if(sms.MessageId) {
                return {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'OTP sent',
                        messageId: sms.MessageId,
                        token: token,
                    })
                };
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
                        message: 'OTP not sent'
                    })
                };
            }
        } else {
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
                const reqBody = '{"to":"/topics/' + PHONE + '", "priority": "high", "notification": {"title": "Barbera Home Salon", "body":"' + msg + '"}}';
                console.log(reqBody);
            
                req.write(reqBody);
                req.end();
                
            });

            console.log(fcmnotif);
        
            if(fcmnotif === 'success') {
                return {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'OTP sent',
                        fcm: fcmnotif,
                        token: token,
                    })
                };
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
                        message: 'OTP not sent'
                    })
                };
            }
        }
    } catch(err) {
        console.log(err);
        return err;
    }

}