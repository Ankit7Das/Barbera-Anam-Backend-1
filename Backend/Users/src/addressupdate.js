require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { userVerifier } = require("./authentication");
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
                    message: 'User not user or barber',
                })
            }
        }

        var params = {
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

        var data;
        var msg;

        try {
            data = await documentClient.update(params).promise();
            msg = 'User info updated successfully';

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: msg
                })
            };
        } catch(err) {
            msg = err;
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: msg,
                })
            };
        }

    }catch(err) {
        console.log(err);
        return err;
    }
}