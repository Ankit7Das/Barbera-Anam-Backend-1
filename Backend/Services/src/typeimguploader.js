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
        var SUB = obj.subtype;
        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];

        console.log(obj);

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

        if (SUB) {
            var params = {
                TableName: 'Services',
                FilterExpression: '#category = :this_category AND #type = :this_type AND #subtype = :this_subtype',
                ExpressionAttributeValues: {':this_category': CAT, ':this_type': TYPE, ':this_subtype': SUB},
                ExpressionAttributeNames: {'#category': 'category', '#type': 'type', '#subtype': 'subtype'}
            }
        
            var data = await documentClient.scan(params).promise();
    
            if(data.Items.length === 0) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: `No service exists in ${TYPE} and ${SUB}`
                    })
                }
            } else {
    
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
                            body: JSON.stringify({
                                message: 'mime is not allowed '
                            })
                        };
                    }
            
                    var CAT_ARR = CAT.split(' ');
                    var CATS = CAT_ARR.join('_');
                    var TYPE_ARR = TYPE.split(' ');
                    var TYPES = TYPE_ARR.join('_');
                    var SUB_ARR = SUB.split(' ');
                    var SUBS = SUB_ARR.join('_');
                    var name = CATS + TYPES + SUBS;
                    var key = `${name}`;
            
                    console.log(`writing image to bucket called ${key}`);
            
                    await s3
                        .upload({
                            Body: buffer,
                            Key: `${key}`,
                            ContentType: detectedMime,
                            Bucket: 'barbera-image',
                            ACL: 'public-read',
                        })
                        .promise();

                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            success: true,
                            message: 'Image uploaded'
                        })
                    }
    
                } else {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'No image was uploaded'
                        })
                    }
                }
            }
        } else {
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
                    body: JSON.stringify({
                        success: false,
                        message: `No service exists in ${TYPE}`
                    })
                }
            } else {
    
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
                            body: JSON.stringify({
                                message: 'mime is not allowed '
                            })
                        };
                    }
            
                    var CAT_ARR = CAT.split(' ');
                    var CATS = CAT_ARR.join('_');
                    var TYPE_ARR = TYPE.split(' ');
                    var TYPES = TYPE_ARR.join('_');
                    var name = CATS + TYPES;
                    var key = `${name}`;
            
                    console.log(`writing image to bucket called ${key}`);
            
                    await s3
                        .upload({
                            Body: buffer,
                            Key: `${key}`,
                            ContentType: detectedMime,
                            Bucket: 'barbera-image',
                            ACL: 'public-read',
                        })
                        .promise();

                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            success: true,
                            message: 'Image uploaded'
                        })
                    }
    
                } else {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'No image was sent'
                        })
                    }
                }
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}