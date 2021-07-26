require('dotenv').config();

var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier } = require("./authentication");

const groupBy = (array, key) => {

    return array.reduce((result, barber) => {
    
        result[barber[key]] = barber;

        return result;
    }, {});
};

const groupById = (array, key) => {

    return array.reduce((result, log) => {
        (result[log[key]] = result[log[key]] || []).push(
            log
        );

        return result;
    }, {});
};

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
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

        if(exist1.user.role != 'admin') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Not an admin',
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
        var params;
        var data;
        var barbers = [];
        var logs = [];

        console.log("user verification");

        for(var i = 0; i < 7; i++) {
            params = {
                TableName: 'BarbersLog',
                ProjectionExpression: '#date, #barberId, #distance',
                KeyConditionExpression: '#date = :d',
                ExpressionAttributeValues: {
                    ':d': day,
                },
                ExpressionAttributeNames: {
                    '#date': 'date',
                    '#barberId':'barberId',
                    '#distance':'distance'
                }
            }

            data = await documentClient.query(params).promise();

            for( var j=0; j<data.Items.length; j++) {
                logs.push(data.Items[j]);
                if(barbers.length < data.Items.length) {
                    barbers.push(data.Items[j].barberId);
                }
            }
            

            today.setDate(today.getDate() - 1);
            dd = String(today.getDate()).padStart(2, '0');
            mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            yyyy = today.getFullYear();
            day = dd + '-' + mm + '-' + yyyy;
        }

        var unique_barbers = barbers.filter((v, i, a) => a.indexOf(v) === i);

        console.log("unique",unique_barbers);

        barbers = [];

        for(var i = 0; i < unique_barbers.length; i++) {

            params = {
                TableName: 'Users',
                Key:{
                    id: unique_barbers[i]
                }
            }

            data = await documentClient.get(params).promise();

            barbers.push(data.Item);
        }

        console.log(logs);

        var groupedBarbers = groupBy(barbers, 'id');
        var groupedLogs = groupById(logs, 'barberId');

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Barber Logs found',
                logs: groupedLogs,
                barbers: groupedBarbers,
                ids: unique_barbers
            })
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}