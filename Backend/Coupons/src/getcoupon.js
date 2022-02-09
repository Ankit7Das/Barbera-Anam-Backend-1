require('dotenv').config();

var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var couponName = obj.couponname;
        var serviceId = event.pathParameters.serviceid;
        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];

        if(token == null) {
            return {
                statusCode: 401,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
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
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
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
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist1.user.role != 'admin') {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Not an admin',
                })
            }
        }

        var params = {
            TableName: 'Coupons',
            Key: {
                name: couponName,
                serviceId: serviceId
            }
        }

        try {
            var data = await documentClient.get(params).promise();

            console.log(data.Item);

            if(serviceId !== 'all') {

                console.log(serviceId, data.Item);
                var serviceIds = serviceId.split(",");

                for(var i=0;i<serviceIds.length;i++) {
                    params = {
                        TableName: 'Services',
                        Key:{
                            id: serviceIds[i]
                        }
                    }
        
                    try {
                        data1 = await documentClient.get(params).promise();
        
                        data.Item.service[i] = data1.Item;
        
                        console.log(data.Item);
                        
                        return {
                            statusCode: 200,
                            headers: {
                                "Access-Control-Allow-Headers" : "Content-Type",
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                            },
                            body: JSON.stringify({
                                success: true,
                                message: 'Coupon found',
                                data: data.Item
                            })
                        } 
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
                        }
                    }
                }

                delete data.Item.serviceId;
            } else {

                console.log("data: ",data.Item);

                data.Item.service = {
                    name: 'all'
                };
                delete data.Item.serviceId;

                console.log(data.Item);

                return {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'Coupon found',
                        data: data.Item
                    })
                } 
            
            }
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
                    message: err
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}