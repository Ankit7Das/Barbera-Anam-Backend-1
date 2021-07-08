require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { userVerifier } = require("./authentication");
var { Buffer } = require('buffer');
const multipart = require('aws-lambda-multipart-parser');
const { JWT_SECRET } = process.env;
const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});
var fileType = require('file-type');

const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];

exports.handler = async (event) => {
    try {
        var buff = Buffer.from(event.body, 'base64');
        var decodedEventBody = buff.toString('latin1'); 
        var decodedEvent = { ...event, body: decodedEventBody };
        var jsonEvent = multipart.parse(decodedEvent, false);
        var asset;

        var EMAIL = jsonEvent.email;
        var NAME = jsonEvent.name;
        var ADD = jsonEvent.address;
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
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }
        if(!exist1.user.name){
            exist1.user.name = null;
        }

        if(!exist1.user.email){
            exist1.user.email = null;
        }

        if(!exist1.user.pic){
            exist1.user.pic = null;
        }

        if(!exist1.user.address){
            exist1.user.address = null;
        }

        var url;
        if(jsonEvent.image) {
            if(exist1.user.pic !== null) {
                url = new URL(exist1.user.pic);
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

            asset = Buffer.from(jsonEvent.image.content, 'latin1');
            var mime = jsonEvent.image.contentType;
            var fileInfo = await fileType.fromBuffer(asset);
            var detectedExt = fileInfo.ext;
            var detectedMime = fileInfo.mime;
    
            if (!allowedMimes.includes(mime)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'mime is not allowed '
                    })
                };
            }

            if (detectedMime !== mime) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'mime types dont match'
                    })
                };
            }
    
            var name = userID.id;
            var key = `${name}.${detectedExt}`;
    
            await s3
                .upload({
                    Body: asset,
                    Key: `profiles/${key}`,
                    ContentType: mime,
                    Bucket: 'barbera-image',
                    ACL: 'public-read',
                })
                .promise();
    
            url = `https://barbera-image.s3-ap-south-1.amazonaws.com/profiles/${key}`;
    
        }
        
        var params = {
            TableName: 'Users',
            Key: {
                id: userID.id,
            },
            UpdateExpression: "set #address=:a, #name=:n, #email=:e, #pic=:p",
            ExpressionAttributeNames: {
                '#name': 'name',
                '#email': 'email',
                '#address': 'address',
                '#pic': 'pic'
            },
            ExpressionAttributeValues:{
                ":n": NAME ? NAME : exist1.user.name,
                ":e": EMAIL ? EMAIL : exist1.user.email,
                ":a": ADD ? ADD : exist1.user.address,
                ":p": url ? url : exist1.user.pic
            },
            ReturnValues:"UPDATED_NEW"
        };

        var data;
        var msg;

        try {
            data = await documentClient.update(params).promise();
            msg = 'User info updated successfully';

            var response = {
                'statusCode': 200,
                'body': JSON.stringify({
                    success: true,
                    message: msg
                })
            };
        } catch(err) {
            msg = err;
            var response = {
                'statusCode': 500,
                'body': JSON.stringify({
                    success: false,
                    message: msg,
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }

    return response;

}