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
        var SLOT = obj.slot;
        var barberId = obj.barberId;
        var service = obj.service;
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

        var exist2;
        var prices = [];
        var total_price = 0;
        var total_time = 0;
        for(var i=0;i<service.length;i++) {
            
            exist2 = await serviceVerifier(service[i].serviceId);

            if(exist2.success == false) {
                break;
            }

            prices.push(service[i].price);
            total_time += service[i].quantity*Number(exist2.service.time);
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
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        var day = dd + '-' + mm + '-' + yyyy;

        // if(Number(today.getHours())>=19) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'The service time is over'
        //         })
        //     }
        // } else if(Number(today.getHours())<9) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'The service time has not started'
        //         })
        //     }
        // }

        console.log(day);

        var params = {
            TableName: 'BarbersLog',
            Key: {
                date: day,
                barberId: barberId
            }
        }

        try {
            var data = await documentClient.get(params).promise();
            var flag = true;

            console.log(data.Item);

            var cnt = 0;

            for(var i = Number(SLOT) ;  ; i++) {
                cnt+=60;

                if( data.Item[String(i)] !== 'p') {
                    flag = false;
                    break;
                }

                if( cnt >= total_time) ) {
                    break;
                }
    
            }

            if(flag) {

                cnt = 0;

                for(var i = Number(SLOT) ;  ; i++) {
                    console.log(i);
        
                    cnt+=60;
                   
                    params = {
                        TableName: 'BarbersLog',
                        Key: {
                            date: day,
                            barberId: barberId
                        },
                        UpdateExpression: "set #slot=:s",
                        ExpressionAttributeNames: {
                            '#slot': i, 
                        },
                        ExpressionAttributeValues:{
                            ":s": 'n',
                        },
                        ReturnValues:"UPDATED_NEW"
                    }
        
                    data = await documentClient.update(params).promise();
        
                    if( cnt >= total_time) {
                        break;
                    }
        
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'Booking reverted'
                    })
                }
            } else {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        success: false,
                        message: 'Invalid slot found'
                    })
                }
            }

            
        } catch(err) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid barber ID'
                })
            }
        }
        

    } catch(err) {
        console.log(err);
        return err;
    }
}