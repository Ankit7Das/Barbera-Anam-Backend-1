require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");


exports.addservice = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var NAME = obj.name;
        var PRICE = obj.price;
        var TIME = obj.time;
        var DET = obj.details;
        var DISC = obj.discount;
        var DOD = obj.dealsofday;
        var ICON = obj.icon;
        var GENDER = obj.gender;
        var TYPE = obj.type;
        var token = event.headers.token;

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

        if(exist1 == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'User not found or user not an admin',
                    succes: false,
                })
            }
        }
        
        var exist2 = await addedBefore(NAME);

        if(exist2 == true) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Already added',
                    succes: false,
                })
            }
        }

        var params = {
            TableName: 'Services',
            Item: {
                id: uuid.v1(),
                name: NAME,
                price: PRICE,
                time: TIME,
                details: DET ? DET : null,
                discount: DISC ? DISC : null,
                icon: ICON ? ICON : null,
                dealOfDay: DOD ? DOD : false,
                type: TYPE,
                gender: GENDER, 
            }
        }

        var data;
        var msg;

        try {
            data = await documentClient.put(params).promise();
            console.log("Item entered successfully:", data);
            msg = 'Service added to database';

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: msg,
                })
            };
        } catch(err) {
            console.log("Error: ", err);
            msg = err;

            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: msg,
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.delservice = async (event) => {
    try {

        var serviceId = event.pathParameters.serviceid;
        var token = event.headers.token;

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

        if(exist1 == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'User not found or user not an admin',
                    succes: false,
                })
            }
        }
        
        var exist2 = await serviceVerifier(serviceId);

        if(exist2 == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Service doesn\'t exist',
                    succes: false,
                })
            }
        }

        var params = {
            TableName: 'Services',
            Key: {
                id: serviceId,
            }
        }

        var data;
        var msg;

        try {
            data = await documentClient.delete(params).promise();
            console.log("Item entered successfully:", data);
            msg = 'Service deleted from database';

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: msg,
                })
            };
        } catch(err) {
            console.log("Error: ", err);
            msg = err;

            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: msg,
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}