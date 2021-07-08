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

        var params = {
            TableName: 'Users',
            Key: {
                id: userID.id,
            }
        }

        var data = await documentClient.get(params).promise();

        if (!data.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'User does not exist'
                })
            };
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'User found',
                    name: data.Item.name,
                    email: data.Item.email,
                    phone: data.Item.phone,
                    address: data.Item.address,
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}