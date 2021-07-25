require('dotenv').config();

var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var couponName = obj.couponname;
        var serviceId = event.pathParameters.serviceid;
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
                statusCode: 400,
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

        var params = {
            TableName: 'Coupons',
            Key: {
                name: couponName,
                serviceId: serviceId
            }
        }

        try {
            var data = await documentClient.get(params).promise();

            params = {
                TableName: 'Services',
                Key:{
                    id: data.Item.serviceId
                }
            }

            try {
                data1 = await documentClient.get(params).promise();

                data.Item.service = data1.Item;

                delete data.Item.serviceId;

                console.log(data.Item);
                
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'Coupon found',
                        data: data.Item
                    })
                } 
            } catch(err) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        success: false,
                        message: err,
                    })
                }
            }
        } catch(err) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: err
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}