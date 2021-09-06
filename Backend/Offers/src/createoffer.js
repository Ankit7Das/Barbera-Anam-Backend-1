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

        var obj = JSON.parse(event.body);
        var serviceName = obj.servicename;
        var DIS = obj.discount;
        var Terms = obj.terms;
        var NAME = obj.name;
        var UserLimit = obj.userlimit;
        var START = obj.start;
        var END = obj.end;

        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];

        if(START === 'Monday') {
            START = 1;
        } else if(START === 'Tuesday') {
            START = 2;
        } else if(START === 'Wednesday') {
            START = 3;
        } else if(START === 'Thursday') {
            START = 4;
        } else if(START === 'Friday') {
            START = 5;
        } else if(START === 'Saturday') {
            START = 6;
        } else if(START === 'Sunday') {
            START = 7;
        }

        if(END === 'Monday') {
            END = 1;
        } else if(END === 'Tuesday') {
            END = 2;
        } else if(END === 'Wednesday') {
            END = 3;
        } else if(END === 'Thursday') {
            END = 4;
        } else if(END === 'Friday') {
            END = 5;
        } else if(END === 'Saturday') {
            END = 6;
        } else if(END === 'Sunday') {
            END = 7;
        }

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

        var params = {
            TableName: 'Services',
            FilterExpression: '#name = :this_name',
            ExpressionAttributeValues: {':this_name': serviceName},
            ExpressionAttributeNames: {'#name': 'name'}
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
                    message: 'Service not found'
                })
            }
        } else {

            params = {
                TableName: 'Offers',
                Key: {
                    serviceId: data.Items[0].id,
                    name: NAME, 
                }
            }
    
            try {
                var data1 = await documentClient.get(params).promise();

                if(data1.Item) {

                    return {
                        statusCode: 400,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: false,
                            message: 'Offer already made'
                        })
                    }
                    
                } else {

                    var url;

                    if(obj.image) {
                
                        let imageData = obj.image;
                        if (obj.image.substr(0, 7) === 'base64,') {
                            imageData = obj.image.substr(7, obj.image.length);
                        }
                
                        var buffer = Buffer.from(imageData, 'base64');
                        var fileInfo = await fileType.fromBuffer(buffer);
                        var detectedExt = fileInfo.ext;
                        var detectedMime = fileInfo.mime;

                        if (!allowedMimes.includes(detectedMime)) {
                            return {
                                statusCode: 400,
                                headers: {
                                    "Access-Control-Allow-Headers" : "Content-Type",
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                                },
                                body: JSON.stringify({
                                    success: false,
                                    message: 'mime is not allowed '
                                })
                            };
                        }
                
                        var name = NAME.split(' ');
                        var names = name.join('_');
                        var key = `${names}.${detectedExt}`;
                
                        console.log(`writing image to bucket called ${key}`);
                
                        await s3
                            .upload({
                                Body: buffer,
                                Key: `offers/${key}`,
                                ContentType: detectedMime,
                                Bucket: 'barbera-image',
                                ACL: 'public-read',
                            })
                            .promise();
                
                        url = `https://barbera-image.s3-ap-south-1.amazonaws.com/offers/${key}`;

                        params = {
                            TableName: 'Offers',
                            Item: {
                                serviceId: data.Items[0].id,
                                name: NAME, 
                                discount: Number(DIS),
                                user_limit: Number(UserLimit),
                                terms: Terms,
                                image: url,
                                start: START,
                                end: END
                            }
                        }
    
                        try {
                            data1 = await documentClient.put(params).promise();
    
                            return {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Headers" : "Content-Type",
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                                },
                                body: JSON.stringify({
                                    success: true,
                                    message: 'Offer added successfully'
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
                                message: 'No image uploaded'
                            })
                        } 
                    }
                    
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
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}