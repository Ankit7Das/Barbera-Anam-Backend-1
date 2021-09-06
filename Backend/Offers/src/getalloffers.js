require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);

        var params = {
            TableName: 'Offers',
        }

        var data = await documentClient.scan(params).promise();
        var data1;

        for(var i=0 ; i<data.Items.length ; i++){
            params = {
                TableName: 'Services',
                Key: {
                    id: data.Items[i].serviceId
                }
            }

            data1 = await documentClient.get(params).promise();

            data.Items[i].service = data1.Item
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Headers" : "Content-Type",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            body: JSON.stringify({
                success: true,
                message: 'Offers found',
                data: data.Items
            })
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}