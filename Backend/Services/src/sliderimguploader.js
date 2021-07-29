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
        var NAME = obj.name;
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

        var exist3 = await addedBefore(NAME);

        if(exist3 == false) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Service not found',
                })
            }
        }

        console.log(exist3);
        
        var params = {
            TableName: 'Stock',
            Key: {
                type: 'Sliders',
                name: NAME
            }
        }
    
        var data = await documentClient.get(params).promise();

        if(!data.Item) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'No such service exists'
                })
            }
        } else {
            var url;

            if(obj.image) {

                if(data.Item.image) {
                    var url = new URL(data.Item.image);
                    var key = url.pathname.substring(1);

                    await s3
                        .deleteObject({
                            Key: `sliders/${key}`,
                            Bucket: 'barbera-image'
                        })
                        .promise();
                }
        
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
                        Key: `sliders/${key}`,
                        ContentType: detectedMime,
                        Bucket: 'barbera-image',
                        ACL: 'public-read',
                    })
                    .promise();
        
                url = `https://barbera-image.s3-ap-south-1.amazonaws.com/sliders/${key}`;

                params = {
                    TableName: 'Stock',
                    Key: {
                        type: 'Sliders',
                        name: NAME
                    },
                    UpdateExpression: "set #image=:i",
                    ExpressionAttributeNames: {
                        '#image': 'image', 
                    },
                    ExpressionAttributeValues:{
                        ":i": url,
                    },
                    ReturnValues:"UPDATED_NEW"
                }
        
                try {
                    data = await documentClient.update(params).promise();
        
                    return {
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: true,
                            message: 'Slider pic uploaded',
                        })
                    }
                } catch(err) {
                    console.log("Error: ", err);
                    return {
                        statusCode: 500,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: false,
                            message: err,
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
                        message: 'No image was sent'
                    })
                }
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}