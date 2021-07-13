require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, serviceVerifier } = require("./authentication");
const { getDistance } = require('./helper');

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var barberId = obj.barberid;
        var service = obj.service;
        var DATE = event.pathParameters.date;
        var SLOT = event.pathParameters.slot;
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

        if(exist1.user.role != 'user') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Not a user',
                })
            }
        }

        var exist3 = await userVerifier(barberId);

        if(exist3.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Barber not found',
                })
            }
        }

        if(exist3.user.role != 'barber') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Not a barber',
                })
            }
        }

        console.log(service);

        var exist2;
        var prices = [];
        var total_price = 0;
        for(var i=0;i<service.length;i++) {
            
            exist2 = await serviceVerifier(service[i].serviceId);

            if(exist2.success == false) {
                break;
            }

            prices.push(exist2.service.price);
            
        }

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Service not found',
                })
            }
        }

        var today = new Date();
        today.setHours(today.getHours() + 5);
        today.setMinutes(today.getMinutes() + 30);

        console.log(Number(SLOT));
        console.log(Number(today.getHours()));

        var date1 = DATE.split('-');

        var date = new Date(date1[2],date1[1],date1[0]);

        console.log(Number(date.getDate()));
        console.log(Number(today.getDate()));

        if(date.getDate()<today.getDate()) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Date chosen is not possible'
                })
            };
        }

        if(date.getDate()===today.getDate()) {
            if(Number(SLOT)<Number(today.getHours())) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'Slot chosen is not possible'
                    })
                };
            }
        }

        var params = {
            TableName: 'BarbersLog',
            Key: {
                date: DATE,
                barberId: barberId
            }
        };

        var data;

        try {
            data = await documentClient.get(params).promise();

            if(data.Item.SLOT === false) {
                var now = new Date();
                now.setHours(now.getHours() + 5);
                now.setMinutes(now.getMinutes() + 30);
                var timest = now.getTime(); 

                for(var i=0;i<service.length;i++){

                    params = {
                        TableName: 'Bookings',
                        Item: {
                            userId: exist1.user.id,
                            serviceId: service[i].serviceId + ',' + timest,
                            barberId: barberId,
                            Timestamp: timest,
                            user_long: exist1.user.longitude,
                            user_lat: exist1.user.latitude,
                            user_add: exist1.user.address,
                            amount: prices[i],
                            payment_status: 'pending',
                            date: DATE,
                            slot: SLOT,
                            quantity: service[i].quantity
                        }
                    };

                    data = await documentClient.put(params).promise();

                    total_price += Number(prices[i]);
                }

                if(cnt === service.length) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: true,
                            message: 'Booking unsuccessful',
                        })
                    }
                }

                var percentage = 0.1;            

                params = {
                    TableName: 'Users',
                    Key: {
                        id: barberId,
                    },
                    UpdateExpression: "set #coins=#coins - :c",
                    ExpressionAttributeNames: {
                        '#coins': 'coins', 
                    },
                    ExpressionAttributeValues:{
                        ":c": percentage*exist3.user.coins,
                    },
                    ReturnValues:"UPDATED_NEW"
                }

                try {
                    data = await documentClient.update(params).promise();

                    params = {
                        TableName: 'BarbersLog',
                        Key: {
                            date: DATE,
                            barberId: barberId,
                        },
                        UpdateExpression: "set #slot=:s",
                        ExpressionAttributeNames: {
                            '#slot': SLOT, 
                        },
                        ExpressionAttributeValues:{
                            ":s": true,
                        },
                        ReturnValues:"UPDATED_NEW"
                    }
            
                    try {
                        data = await documentClient.update(params).promise();
            
                        return {
                            statusCode: 200,
                            body: JSON.stringify({
                                success: true,
                                message: 'Booking successful',
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
                    console.log("Error: ", err);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({
                            success: false,
                            message: err,
                        })
                    };
                }
            }else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'Booking unsuccessful',
                    })
                };
            }
        }catch(err) {
            console.log("Error: ", err);
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Booking unsuccessful',
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}