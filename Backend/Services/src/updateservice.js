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
    
        var ID = obj.id;
        var NAME = obj.name;
        var PRICE = obj.price;
        var TIME = obj.time;
        var DET = obj.details;
        var CUT = obj.cutprice;
        var DOD = obj.dod;
        var CAT = obj.category;
        var TYPE = obj.type;
        var SUBTYPE = obj.subtype;
        var TREND = obj.trending;
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
        
        var exist2 = await serviceVerifier(ID);

        if(exist2.success == false) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'No such service exists for updating',
                })
            }
        }

        var url;

        if(obj.image) {
            if(exist2.service.icon) {
                var url = new URL(exist2.service.icon);
                var key = url.pathname.substring(1);

                try {
                    await s3
                        .deleteObject({
                            Key: key,
                            Bucket: 'barbera-image'
                        })
                        .promise();
                } catch(err){
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                        })
                    };
                }
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
                    body: JSON.stringify({
                        message: 'mime is not allowed '
                    })
                };
            }
    
            var name = ID;
            var key = `${name}.${detectedExt}`;
    
            console.log(`writing image to bucket called ${key}`);
    
            await s3
                .upload({
                    Body: buffer,
                    Key: `services/${key}`,
                    ContentType: detectedMime,
                    Bucket: 'barbera-image',
                    ACL: 'public-read',
                })
                .promise();
    
            url = `https://barbera-image.s3-ap-south-1.amazonaws.com/services/${key}`;
        }

        var params = {
            TableName: 'Services',
            Key: {
                id: ID,
            },
            UpdateExpression: "set #name=:n, #price=:p, #time=:ti, #details=:det, #cut=:c, #deal=:dod, #image=:i, #type=:t, #subtype=:s, #category=:g, #trend=:tr",
            ExpressionAttributeNames: {
                '#name': 'name',
                '#price': 'price',
                '#time': 'time',
                '#details': 'details',
                '#cut': 'cutprice',
                '#deal': 'dod',
                '#image':'image',
                '#type': 'type',
                '#subtype': 'subtype',
                '#category': 'category',
                '#trend': 'trending', 
            },
            ExpressionAttributeValues:{
                ":n": NAME,
                ":p": PRICE,
                ":ti": TIME,
                ":det": DET ? DET : null,
                ":c": CUT ? CUT : null,
                ":i": url ? url : null,
                ":dod": DOD ? DOD : false,
                ":t": TYPE,
                ":s": SUBTYPE,
                ":g": CAT,
                ":tr": TREND
            },
            ReturnValues:"UPDATED_NEW"
        }

        var data;
        var msg;

        try {
            data = await documentClient.update(params).promise();
            msg = 'Service info updated';

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