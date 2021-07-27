require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
var { Buffer } = require('buffer');
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");
const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});
var fileType = require('file-type');

const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];


exports.handler = async (event) => {
    try {

        console.log(event);

        var obj = JSON.parse(event.body);
        var CAT = obj.category;
        var TYPE = obj.type;
        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];

        console.log(obj);

        if(token == null) {
            return {
                statusCode: 401,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
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
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
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
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist1.user.role != 'admin') {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Not an admin',
                })
            }
        }

        if (TYPE) {
            var params = {
                TableName: 'Services',
                FilterExpression: '#category = :this_category AND #type = :this_type',
                ExpressionAttributeValues: {':this_category': CAT, ':this_type': TYPE},
                ExpressionAttributeNames: {'#category': 'category', '#type': 'type'}
            }
        
            var data = await documentClient.scan(params).promise();
    
            if(data.Items.length === 0) {
                return {
                    statusCode: 400,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: false,
                        message: `No service exists in ${TYPE}`
                    })
                }
            } else {

                var CAT_ARR = CAT.split(' ');
                var CATS = CAT_ARR.join('_');
                var TYPE_ARR = TYPE.split(' ');
                var TYPES = TYPE_ARR.join('_');
                var name = CATS + TYPES;
                var key = `${name}`;

                try {
                    await s3
                        .deleteObject({
                            Key: key,
                            Bucket: 'barbera-image'
                        })
                        .promise();

                    return {
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: true,
                            message: 'Image deleted'
                        })
                    }
                } catch(err){
                    return {
                        statusCode: 400,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: false,
                            message: err
                        })
                    };
                }
    
            }
        } else {
            var params = {
                TableName: 'Services',
                FilterExpression: '#category = :this_category',
                ExpressionAttributeValues: {':this_category': CAT },
                ExpressionAttributeNames: {'#category': 'category'}
            }
        
            var data = await documentClient.scan(params).promise();
    
            if(data.Items.length === 0) {
                
                params = {
                    TableName: 'Stock',
                    Key: {
                        type: 'Tabs',
                        name: CAT
                    }
                }

                try {
                    data = await documentClient.get(params).promise();

                    if(data.Item) {
                        if(data.Item.image) {
                            var url = new URL(data.Item.image);
                            var key = url.pathname.substring(1);
    
                            await s3
                                .deleteObject({
                                    Key: `tabs/${key}`,
                                    Bucket: 'barbera-image'
                                })
                                .promise();
                        }

                    }

                    params = {
                        TableName: 'Stock',
                        Key: {
                            type: 'Tabs',
                            name: CAT
                        }
                    }

                    try {
                        data = await documentClient.delete(params).promise();

                        return {
                            statusCode: 200,
                            headers: {
                                "Access-Control-Allow-Headers" : "Content-Type",
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                            },
                            body: JSON.stringify({
                                success: true,
                                message: 'Image deleted'
                            })
                        }
                    } catch(err) {
                        return {
                            statusCode: 500,
                            headers: {
                                "Access-Control-Allow-Headers" : "Content-Type",
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                            },
                            body: JSON.stringify({
                                success: false,
                                message: err
                            })
                        };
                    }
                }catch(err) {
                    return {
                        statusCode: 500,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: false,
                            message: err
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
                        message: `No service exists in ${TYPE}`
                    })
                }
                
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}