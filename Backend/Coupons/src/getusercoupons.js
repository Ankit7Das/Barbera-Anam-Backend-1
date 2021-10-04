require('dotenv').config();

var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");

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
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist1.user.role != 'user') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Not a user',
                })
            }
        }

        var params = {
            TableName: 'Coupons'
        }

        try {
            var data = await documentClient.scan(params).promise();

            var coupons = [];

            for(var i=0; i<data.Items.length; i++) {
                if(!data.Items[i].used_by.includes(userID.id) && !data.Items[i].invisible) {
                    coupons.push(data.Items[i]);
                }
            }

            params = {
                TableName: 'Stock',
                Key: {
                    type: 'Ref',
                    name: 'ref'
                }
            }

            data = await documentClient.get(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Coupons found',
                    data: coupons,
                    refquantity: exist1.user.invites,
                    refcoupon: data.Item.couponName
                })
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