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
        var DATE = obj.date;
        var serviceId = obj.serviceId;
        var userId = obj.userId;

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

        var today = new Date();
        today.setHours(today.getHours() + 5);
        today.setMinutes(today.getMinutes() + 30);
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        var day = dd + '-' + mm + '-' + yyyy;

        // if(day !== DATE) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'Your booking is on a different day'
        //         })
        //     };
        // }

        var params = {
            TableName: 'Bookings',
            Key: {
                userId: userId,
                serviceId: serviceId[0]
            }
        }

        var data = await documentClient.get(params).promise();

        if(data.Item) {
            if( OTP === data.Item.start_serv_otp ) {
                for(var i=0; i<serviceId.length; i++) {

                    params = {
                        TableName: 'Bookings',
                        Key: {
                            userId: userId,
                            serviceId: serviceId[i]
                        },
                        UpdateExpression: "set #service_status=:s, #start_serv_otp=:st",
                        ExpressionAttributeNames: {
                            '#service_status': 'service_status', 
                            '#start_serv_otp': 'start_serv_otp'
                        },
                        ExpressionAttributeValues:{
                            ":s": 'ongoing',
                            ":st": null
                        },
                        ReturnValues:"UPDATED_NEW"
                    }
    
                    data = await documentClient.update(params).promise();
                }

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
                        ":m": 'end',
                    },
                    ReturnValues:"UPDATED_NEW"
                }

                data = await documentClient.update(params).promise();

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'OTP matched'
                    })
                };
            } else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'OTP mismatch'
                    })
                };
            }
        }else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'No such booking exists'
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}