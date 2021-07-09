require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { userVerifier } = require("./authentication");
const { JWT_SECRET } = process.env;


exports.handler = async(event) => {
    try {
        var obj = JSON.parse(event.body);

        var PHONE = obj.phone;

        var params = {
            TableName: 'Users',
            FilterExpression: '#phone = :this_phone',
            ExpressionAttributeValues: {':this_phone': PHONE},
            ExpressionAttributeNames: {'#phone': 'phone'}
        };
        
        var data = await documentClient.scan(params).promise();
        var random = Math.floor(100000 + Math.random() * 900000);

        if(data.Items.length == 0) {
            var code;
            var data1;

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

                if(obj.ref) {
                    params = {
                        TableName: 'Users',
                        FilterExpression: '#referral = :this_referral',
                        ExpressionAttributeValues: {':this_referral': obj.ref},
                        ExpressionAttributeNames: {'#referral': 'referral'}
                    };
    
                    data = await documentClient.scan(params).promise();

                    console.log(data);

                    if(data.Items.length === 0) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({
                                success: false,
                                message: 'Referral code is invalid'
                            })
                        }
                    } else {
                        params = {
                            TableName: 'Users',
                            Key: {
                                id: data.Items[0].id,
                            },
                            UpdateExpression: "set #invites=#invites + :i",
                            ExpressionAttributeNames: {
                                '#invites': 'invites',
                            },
                            ExpressionAttributeValues:{
                                ":i": 1,
                            },
                            ReturnValues:"UPDATED_NEW"
                        };

                        data = await documentClient.update(params).promise();
                    }
                }
            } catch(err) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        success: false,
                        message: err,
                    })
                };
            }

        } else {

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

        params = {
            Message: msg,
            PhoneNumber: '+91' + PHONE,
        };
    
        var sms = await sns.publish(params).promise();
    
        if(sms.MessageId) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    messageId: sms.MessageId,
                    token: token,
                })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    messageSuccess: false,
                })
            };
        }
    } catch(err) {
        console.log(err);
        return err;
    }

}