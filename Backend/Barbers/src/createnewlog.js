require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

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
                '1000': 'n',
                '1010': 'n',
                '1020': 'n',
                '1030': 'n',
                '1040': 'n',
                '1050': 'n',
                '1100': 'n',
                '1110': 'n',
                '1120': 'n',
                '1130': 'n',
                '1140': 'n',
                '1150': 'n',
                '1200': 'n',
                '1210': 'n',
                '1220': 'n',
                '1230': 'n',
                '1240': 'n',
                '1250': 'n',
                '1300': 'n',
                '1310': 'n',
                '1320': 'n',
                '1330': 'n',
                '1340': 'n',
                '1350': 'n',
                '1400': 'n',
                '1410': 'n',
                '1420': 'n',
                '1430': 'n',
                '1440': 'n',
                '1450': 'n',
                '1500': 'n',
                '1510': 'n',
                '1520': 'n',
                '1530': 'n',
                '1540': 'n',
                '1550': 'n',
                '1600': 'n',
                '1610': 'n',
                '1620': 'n',
                '1630': 'n',
                '1640': 'n',
                '1650': 'n',
                '1700': 'n',
                '1710': 'n',
                '1720': 'n',
                '1730': 'n',
                '1740': 'n',
                '1750': 'n',
                '1800': 'n',
                '1810': 'n',
                '1820': 'n',
                '1830': 'n',
                '1840': 'n',
                '1850': 'n',
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