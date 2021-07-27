require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
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
        var OTP = obj.otp;
        var userId = obj.userId;
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

        if(exist1.user.role != 'barber') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Not a barber',
                })
            }
        }

        if( OTP === exist1.user.service_end_otp ) {
            var params = {
                TableName: 'Users',
                Key: {
                    id: userID.id,
                },
                UpdateExpression: "set #service_end_otp=:s",
                ExpressionAttributeNames: {
                    '#service_end_otp': 'service_end_otp', 
                },
                ExpressionAttributeValues:{
                    ":s": null,
                },
                ReturnValues:"UPDATED_NEW"
            }

            try {
                var data = await documentClient.update(params).promise();

                for(var i=0; i<serviceId.length; i++) {
                    params = {
                        TableName: 'Bookings',
                        Key: {
                            userId: userId,
                            serviceId: serviceId[i]
                        },
                        UpdateExpression: "set #payment_status=:p",
                        ExpressionAttributeNames: {
                            '#payment_status': 'payment_status', 
                        },
                        ExpressionAttributeValues:{
                            ":p": 'paid',
                        },
                        ReturnValues:"UPDATED_NEW"
                    }

                    data = await documentClient.update(params).promise();
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'OTP matched'
                    })
                }

                // params = {
                //     TableName: 'Bookings',
                //     KeyConditionExpression: '#userId = :u',
                //     FilterExpression: '#slot = :s, #date = :d',
                //     ExpressionAttributeValues: {
                //         ':d': DATE,
                //         ':s': SLOT,
                //         ':u': id
                //     },
                //     ExpressionAttributeNames: {
                //         '#date': 'date',
                //         '#slot': 'slot',
                //         '#userId': 'userId'
                //     }
                // }

                // data = await documentClient.query(params).promise();

                // if(data.Items.length === 0) {
                //     return {
                //         statusCode: 500,
                //         body: JSON.stringify({
                //             success: false,
                //             message: 'No such booking exists'
                //         })
                //     };
                // } else {
                //     params = {
                //         TableName: 'Bookings',
                //         Key: {
                //             userId: id,
                //             serviceId: data.Items[0].serviceId
                //         },
                //         UpdateExpression: "set #payment_status=:p",
                //         ExpressionAttributeNames: {
                //             '#payment_status': 'payment_status', 
                //         },
                //         ExpressionAttributeValues:{
                //             ":p": PAY,
                //         },
                //         ReturnValues:"UPDATED_NEW"
                //     }

                //     try {
                //         data = await documentClient.update(params).promise();

                //         return {
                //             statusCode: 200,
                //             body: JSON.stringify({
                //                 success: true,
                //                 message: 'OTP matched'
                //             })
                //         }
                //     } catch(err) {
                //         return {
                //             statusCode: 400,
                //             body: JSON.stringify({
                //                 success: false,
                //                 message: err
                //             })
                //         }
                //     }
                // }
            } catch(err) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        success: false,
                        message: err
                    })
                };
            }
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'OTP mismatch'
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}