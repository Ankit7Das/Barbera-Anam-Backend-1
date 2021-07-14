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
            if(Number(SLOT)-1<=Number(today.getHours())) {
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
            ProjectionExpression: 'barberId',
            KeyConditionExpression: '#date = :d',
            FilterExpression: '#slot = :s',
            ExpressionAttributeValues: {
                ':d': DATE,
                ':s': false,
            },
            ExpressionAttributeNames: {
                '#date': 'date',
                '#slot': SLOT,
            }
        }

        try {
            var data = await documentClient.query(params).promise();

            var data1;
            var barbers = [];
            var long1 = exist1.user.longitude;
            var lat1 = exist1.user.latitude;

            for(var i=0;i<data.Items.length;i++){
                params = {
                    TableName: 'Users',
                    Key: {
                        id: data.Items[i].barberId,
                    },
                    ProjectionExpression: 'id, address, phone, longitude, latitude, coins'
                }

                data1 = await documentClient.get(params).promise();
                data1.Item.distance = await getDistance(lat1,long1,data1.Item.latitude,data1.Item.longitude);

                if(data1.Item.coins >= 300 && data1.Item.distance<=10) {
                    barbers.push(data1.Item);
                } else {
                    continue;
                }
            }

            barbers.sort((a, b) => {
                if(a.distance>b.distance) {
                    return 1;
                }else if(a.distance<b.distance) {
                    return -1;
                }else {
                    return 0;
                }
            });

            for(var i=0;i<barbers.length;i++){
                delete barbers[i].longitude;
                delete barbers[i].latitude;
                delete barbers[i].coins;
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'List of free barbers',
                    barbers: barbers,
                })
            }
        } catch(err) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Slot not found'
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}