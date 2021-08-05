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

        var params = {
            TableName: 'Users',
            FilterExpression: '#role = :this_role',
            ExpressionAttributeValues: {':this_role': 'barber'},
            ExpressionAttributeNames: {'#role': 'role'},
        }

        try {
            var data = await documentClient.scan(params).promise();

            var today = new Date();
            today.setHours(today.getHours() + 5);
            today.setMinutes(today.getMinutes() + 30);
            today.setDate(today.getDate() + 6);
            var dd = String(today.getDate()).padStart(2, '0');
            var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            var yyyy = today.getFullYear();
            var day = dd + '-' + mm + '-' + yyyy;

            for(var i=0; i<data.Items.length; i++) {
                params = {
                    TableName: 'BarbersLog',
                    Item: {
                        date: day,
                        barberId: data.Items[i].id,
                        distance: 0,
                        '6': 'n',
                        '7': 'n',
                        '8': 'n',
                        '9': 'n',
                        '10': 'n',
                        '11': 'n',
                        '12': 'n',
                        '13': 'n',
                        '14': 'n',
                        '15': 'n',
                        '16': 'n',
                        '17': 'n',
                        '18': 'n',
                    }
                }
    
                data = await documentClient.put(params).promise();
            }
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'New Date log created'
                })
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