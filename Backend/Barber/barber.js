require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier } = require("./authentication");


exports.locationupdate = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var LONG = obj.longitude;
        var LAT = obj.latitude;
        var token = event.headers.token;

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

        if(exist1 == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'User not found or user not a barber',
                    success: false,
                })
            }
        }

        var params = {
            TableName: 'BarbersLog',
            Key: {
                id: userID.id,
            }
        }

        var data = await documentClient.get(params).promise();

        if(!data.Item) {

            params = {
                TableName: 'BarbersLog',
                Item: {
                    id: userID.id,
                    longitude: LONG,
                    latitude: LAT,
                }
            }

            try {
                data = await documentClient.put(params).promise();
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'Barber location inserted',
                    })
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
                TableName: 'BarbersLog',
                Key: {
                    id: userID.id,
                },
                UpdateExpression: "set #long=:lo, #lang=:la",
                ExpressionAttributeNames: {
                    '#long': 'longitude',
                    '#lat': 'latitude',
                },
                ExpressionAttributeValues:{
                    ":lo": LONG,
                    ":la": LAT,
                },
                ReturnValues:"UPDATED_NEW"
            };
    
            try {
                data = await documentClient.update(params).promise();
    
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'Barber location updated',
                    })
                };
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

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.createnewlog = async (event) => {
    try {

        var token = event.headers.token;

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
                    message: 'User not a barber',
                })
            }
        }

        var today = new Date();
        today.setHours(today.getHours() + 5);
        today.setMinutes(today.getMinutes() + 30);
        today.setDate(today.getDate() + 6);
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        var day = dd + '-' + mm + '-' + yyyy;

        var params = {
            TableName: 'BarbersLog',
            Item: {
                date: day,
                barberId: userID.id,
                '10': false,
                '11': false,
                '12': false,
            }
        }

        try {
            var data = await documentClient.put(params).promise();

            today = new Date();
            today.setHours(today.getHours() + 5);
            today.setMinutes(today.getMinutes() + 30);
            dd = String(today.getDate()).padStart(2, '0');
            mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            yyyy = today.getFullYear();
            day = dd + '-' + mm + '-' + yyyy;

            params = {
                TableName: 'BarbersLog',
                Key: {
                    date: day,
                    barberId: userID.id,
                }
            }

            data = await documentClient.get(params).promise();

            if(!data.Item) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        success: false,
                        message: 'Log for today not found'
                    })
                }
            } else {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'New Date log created',
                        data:data.Item
                    })
                }
            }
        } catch(err) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: err
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}