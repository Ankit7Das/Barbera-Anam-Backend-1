require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-1' });
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
                    succes: false,
                })
            }
        }

        var params = {
            TableName: 'Barbers',
            Key: {
                id: userID.id,
            }
        }

        var data = await documentClient.get(params).promise();

        if(!data.Item) {

            params = {
                TableName: 'Barbers',
                Item: {
                    id: userID.id,
                    longitude: LONG,
                    latitude: LAT,
                    day1: {
                        '10':false,
                        '11':false,
                        '12':false,
                    },
                    day2: {
                        '10':false,
                        '11':false,
                        '12':false,
                    },
                    day3: {
                        '10':false,
                        '11':false,
                        '12':false,
                    },
                    day4: {
                        '10':false,
                        '11':false,
                        '12':false,
                    },
                    day5: {
                        '10':false,
                        '11':false,
                        '12':false,
                    },
                    day6: {
                        '10':false,
                        '11':false,
                        '12':false,
                    },
                    day7: {
                        '10':false,
                        '11':false,
                        '12':false,
                    },
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
                TableName: 'Barbers',
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

exports.getbarbers = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var day = obj.day;  
        var slot = obj.slot;

        var params = {
            TableName: 'Barbers',
            FilterExpression: 'day1.10 = :this_day',
            ExpressionAttributeValues: {':this_day': { "BOOL" : false }},
            //ExpressionAttributeNames: {'#day': 'day1.10'}
        }

        var data = await documentClient.scan(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                data: data
            })
        };

    } catch(err) {
        console.log(err);
        return err;
    }
}