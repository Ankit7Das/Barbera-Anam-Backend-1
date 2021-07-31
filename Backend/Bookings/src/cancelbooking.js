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

        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];
        var obj = JSON.parse(event.body);
        var DATE = obj.date;
        var SLOT = obj.slot;
        var serviceId = obj.serviceId;
        var barberId = obj.barberId;
        
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

        var params;
        var data;
        var serv;
        var total_time = 0;
        var quantity;

        for(var i=0; i<serviceId.length; i++) {
            params = {
                TableName: 'Bookings',
                Key: {
                    userId: userID.id,
                    serviceId: serviceId[i]
                }
            }

            data = await documentClient.get(params).promise();

            quantity = data.Item.quantity

            serv = serviceId[i].split(",");

            params = {
                TableName: 'Services',
                Key: {
                    id: serv[0]
                }
            }

            data = await documentClient.get(params).promise();

            total_time += quantity*data.Item.time;

            params = {
                TableName: 'Bookings',
                Key: {
                    userId: userID.id,
                    serviceId: serviceId[i]
                }
            }

            data = await documentClient.delete(params).promise();
        }

        var cnt = 0;

        for(var i=Number(SLOT); ; i++) {

            cnt += 60;

            params = {
                TableName: 'BarbersLog',
                Key: {
                    date: DATE,
                    barberId: barberId
                },
                UpdateExpression: "set #slot=:s",
                ExpressionAttributeNames: {
                    '#slot': String(i), 
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
                message: 'Booking cancelled',
            })
        }
    } catch(err) {
        console.log(err);
        return err;
    }
}