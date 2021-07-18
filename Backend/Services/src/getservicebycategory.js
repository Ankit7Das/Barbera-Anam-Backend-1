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

        var CAT = event.pathParameters.category;
        // var tokenArray = event.headers.Authorization.split(" ");
        // var token = tokenArray[1];

        // if(token == null) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "No token passed"
        //         })
        //     };
        // }

        // var userID;

        // try {
        //     userID = jwt.verify(token, JWT_SECRET);
        // } catch(err) {
        //     return {
        //         statusCode: 403,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "Invalid Token",
        //         })
        //     };
        // }

        // var exist1 = await userVerifier(userID.id);

        // if(exist1.success == false) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not found',
        //         })
        //     }
        // }

        // if(exist1.user.role != 'user') {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'Not an admin',
        //         })
        //     }
        // }

        var params = {
            TableName: 'Services',
            ProjectionExpression: '#type',
            FilterExpression: '#category = :this_category',
            ExpressionAttributeValues: {':this_category': CAT},
            ExpressionAttributeNames: {'#category': 'category', '#type': 'type'},
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length == 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    message: 'No Types found'
                })
            }
        } else {

            var type = [];
            for(var i=0;i<data.Items.length;i++) {
                type.push(data.Items[i].type);
            }

            var unique_type = type.filter((v, i, a) => a.indexOf(v) === i);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Types found',
                    data: unique_type
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}


