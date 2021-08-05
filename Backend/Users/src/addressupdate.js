require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { userVerifier } = require("./authentication");
const { getDistance } = require('./helper');
const { JWT_SECRET } = process.env;

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var ADD = obj.address;
        var LONG = obj.longitude;
        var LAT = obj.latitude;
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

        if(exist1.user.role == 'admin') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Not a user or barber',
                })
            }
        }

        var params;
        var data;
        var today = new Date();
        today.setHours(today.getHours() + 5);
        today.setMinutes(today.getMinutes() + 30);
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        var day = dd + '-' + mm + '-' + yyyy;


        var DIST = await getDistance(exist1.user.latitude, exist1.user.longitude, LAT, LONG);

        if(exist1.user.role === 'barber') {
            params = {
                TableName: 'BarbersLog',
                Key: {
                    date: day,
                    barberId: exist1.user.id
                },
                UpdateExpression: "set #distance=#distance + :d",
                ExpressionAttributeNames: {
                    '#distance': 'distance'
                },
                ExpressionAttributeValues:{
                    ":d": DIST,
                },
                ReturnValues:"UPDATED_NEW"
            }
    
            data = await documentClient.update(params).promise();
        }

        params = {
            TableName: 'Users',
            Key: {
                id: userID.id,
            },
            UpdateExpression: "set #address=:a, #long=:lo, #lat=:la",
            ExpressionAttributeNames: {
                '#address': 'address',
                '#long': 'longitude',
                '#lat': 'latitude'
            },
            ExpressionAttributeValues:{
                ":a": ADD,
                ":lo": LONG,
                ":la": LAT
            },
            ReturnValues:"UPDATED_NEW"
        };

        try {
            data = await documentClient.update(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'User info updated successfully'
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

    }catch(err) {
        console.log(err);
        return err;
    }
}