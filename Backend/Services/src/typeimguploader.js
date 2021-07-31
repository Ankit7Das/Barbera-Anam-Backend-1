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
        var TAB = obj.tab;
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

        if (!TAB) {
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
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: true,
                            message: 'Image uploaded'
                        })
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
                
                params = {
                    TableName: 'Stock',
                    Key: {
                        type: 'Tabs',
                        name: CAT + ',' + TYPE
                    }
                }
    
                try {
                    data = await documentClient.get(params).promise();
    
                    console.log(data.Item);
    
                    if(obj.image) {
    
                        console.log("image");
    
                        if(data.Item.image) {
    
                            console.log("delete image");
                            var url = new URL(data.Item.image);
                            var key = url.pathname.substring(1);
    
                            await s3
                                .deleteObject({
                                    Key: `${key}`,
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
                                    message: 'mime is not allowed '
                                })
                            };
                        }
                
                        var CAT_ARR = CAT.split(' ');
                        var CATS = CAT_ARR.join('_');
                        var TYPE_ARR = TYPE.split(' ');
                        var TYPES = TYPE_ARR.join('_');
                        var name = CATS + TYPES;
                        var key = `${name}.${detectedExt}`;
                
                        console.log(`writing image to bucket called ${key}`);
                
                        await s3
                            .upload({
                                Body: buffer,
                                Key: `tabs/${key}`,
                                ContentType: detectedMime,
                                Bucket: 'barbera-image',
                                ACL: 'public-read',
                            })
                            .promise();
    
                        var url = `https://barbera-image.s3-ap-south-1.amazonaws.com/tabs/${key}`;

                        console.log(CAT + ',' + TYPE);
    
                        params = {
                            TableName: 'Stock',
                            Item: {
                                type: 'Tabs',
                                name: CAT + ',' + TYPE,
                                image: url
                            }
                        }
    
                        try {
                            data = await documentClient.put(params).promise();
    
                            console.log("done");
                        
                            return {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Headers" : "Content-Type",
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                                },
                                body: JSON.stringify({
                                    success: true,
                                    message: 'Image uploaded'
                                })
                            }
                        } catch(err) {
                            console.log("inside");
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
                } catch(err) {
                    console.log("outside");
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
            }
            
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}