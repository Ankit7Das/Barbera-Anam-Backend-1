require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { userVerifier } = require("./authentication");
const { JWT_SECRET } = process.env;


exports.handler = async(event) => {
    try {
        console.log(event);
        var obj = JSON.parse(event.body);

        var EMAIL = obj.email;

        var params = {
            TableName: 'Users',
            FilterExpression: '#email = :this_email',
            ExpressionAttributeValues: {':this_email': EMAIL},
            ExpressionAttributeNames: {'#email': 'email'}
        };

        var data = await documentClient.scan(params).promise();
        
        if(data.Items.length !== 0) {
            if(data.Items[0].role === 'admin') {

                var user = {
                    email: EMAIL,
                }
        
                var token = jwt.sign(user, JWT_SECRET, {});

                return {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'Email validated',
                        token: token
                    })
                };
            } else {
                return {
                    statusCode: 400,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: false,
                        message: 'You have not been given access as an admin'
                    })
                };
            }
        } else {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'You have not been given access as an admin'
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }

}