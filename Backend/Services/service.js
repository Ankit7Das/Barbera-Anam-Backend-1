require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
var { Buffer } = require('buffer');
const multipart = require('aws-lambda-multipart-parser');
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");
const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});
var fileType = require('file-type');

const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];


exports.addservice = async (event) => {
    try {

        var buff = Buffer.from(event.body, 'base64');
        var decodedEventBody = buff.toString('latin1'); 
        var decodedEvent = { ...event, body: decodedEventBody };
        var jsonEvent = multipart.parse(decodedEvent, false);
        var asset;
    
        var ID = uuid.v1();
        var NAME = jsonEvent.name;
        var PRICE = jsonEvent.price;
        var TIME = jsonEvent.time;
        var DET = (jsonEvent.details==='null') ? null : jsonEvent.details;
        var CUT = (jsonEvent.cutprice==='null') ? null : jsonEvent.cutprice;
        var DOD = (jsonEvent.dod==='true') ? true : false;
        var GENDER = jsonEvent.gender;
        var TYPE = jsonEvent.type;
        var SUBTYPE = (jsonEvent.subtype==='null') ? null : jsonEvent.subtype;
        var TREND = (jsonEvent.trending==='true') ? true : false;
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
                    message: 'User not an admin',
                })
            }
        }
        
        var exist2 = await addedBefore(NAME);

        if(exist2 == true) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Service already added',
                })
            }
        }

        var url;

        if(jsonEvent.image) {
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
    
            var name = ID;
            var key = `${name}.${detectedExt}`;
    
            await s3
                .upload({
                    Body: asset,
                    Key: `services/${key}`,
                    ContentType: mime,
                    Bucket: 'barbera-image',
                    ACL: 'public-read',
                })
                .promise();
    
            url = `https://barbera-image.s3-ap-south-1.amazonaws.com/services/${key}`;
        }

        var params = {
            TableName: 'Services',
            Item: {
                id: ID,
                name: NAME,
                price: PRICE,
                time: TIME,
                details: DET ? DET : null,
                cutprice: CUT ? CUT : null,
                icon: url ? url : null,
                dod: DOD ? DOD : false,
                type: TYPE,
                subtype: SUBTYPE,
                gender: GENDER,
                trending: TREND ? TREND : false
            }
        }

        var data;
        var msg;

        try {
            data = await documentClient.put(params).promise();
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
                    message: 'User not an admin',
                })
            }
        }
        
        var exist2 = await serviceVerifier(serviceId);

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Service doesn\'t exist',
                    success: false,
                })
            }
        }

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

exports.getservicebyid = async (event) => {
    try {

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
                    message: 'User not an admin',
                })
            }
        }
        
        var exist2 = await serviceVerifier(serviceId);

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Service not found',
                })
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Service found',
                data: exist2.service
            })
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.updateservice = async (event) => {
    try {

        var buff = Buffer.from(event.body, 'base64');
        var decodedEventBody = buff.toString('latin1'); 
        var decodedEvent = { ...event, body: decodedEventBody };
        var jsonEvent = multipart.parse(decodedEvent, false);
        var asset;
    
        var ID = jsonEvent.id;
        var NAME = jsonEvent.name;
        var PRICE = jsonEvent.price;
        var TIME = jsonEvent.time;
        var DET = (jsonEvent.details==='null') ? null : jsonEvent.details;
        var CUT = (jsonEvent.cutprice==='null') ? null : jsonEvent.cutprice;
        var DOD = (jsonEvent.dod==='true') ? true : false;
        var GENDER = jsonEvent.gender;
        var TYPE = jsonEvent.type;
        var SUBTYPE = (jsonEvent.subtype==='null') ? null : jsonEvent.subtype;
        var TREND = (jsonEvent.trending==='true') ? true : false;
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
                    message: 'User not an admin',
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

        if(jsonEvent.image) {
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
    
            var name = ID;
            var key = `${name}.${detectedExt}`;
    
            await s3
                .upload({
                    Body: asset,
                    Key: `services/${key}`,
                    ContentType: mime,
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
            UpdateExpression: "set #name=:n, #price=:p, #time=:ti, #details=:det, #cut=:c, #deal=:dod, #icon=:i, #type=:t, #subtype=:s, #gender=:g, #trend=:tr",
            ExpressionAttributeNames: {
                '#name': 'name',
                '#price': 'price',
                '#time': 'time',
                '#details': 'details',
                '#cut': 'cutprice',
                '#deal': 'dod',
                '#icon':'icon',
                '#type': 'type',
                '#subtype': 'subtype',
                '#gender': 'gender',
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
                ":g": GENDER,
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

exports.getallservicenames = async (event) => {
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

        if(exist1.user.role != 'admin') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'User not an admin',
                })
            }
        }

        var params = {
            TableName: 'Services',
            ProjectionExpression: "#id, #name",
            ExpressionAttributeNames: {
                "#name": "name",
                "#id": 'id'
            },
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length != 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Service list',
                    data: data.Items
                })
            }
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'No service entered'
                })
            }
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.gettrending = async (event) => {
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
                    message: 'Not an user',
                })
            }
        }

        var params = {
            TableName: 'Services',
            FilterExpression: '#trend = :this_trend',
            ExpressionAttributeValues: {':this_trend': true},
            ExpressionAttributeNames: {'#trend': 'trending'}
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length == 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    message: 'No trending services'
                })
            }
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Trending services',
                    data: data.Items
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.getservicebysubtype = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var SUBTYPE = obj.subtype; 
        var GENDER = event.pathParameters.gender;
        var TYPE = obj.type;
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
                    message: 'User not an user',
                })
            }
        }

        var params = {
            TableName: 'Services',
            FilterExpression: '#gender = :this_gender AND #type = :this_type AND #subtype = :this_subtype',
            ExpressionAttributeValues: {':this_gender': GENDER, ':this_type': TYPE, ':this_subtype': SUBTYPE},
            ExpressionAttributeNames: {'#gender': 'gender', '#type': 'type', '#subtype': 'subtype'}
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length == 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'No Services found'
                })
            }
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Services found',
                    data: data.Items
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.getservicebytype = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var GENDER = event.pathParameters.gender;
        var TYPE = obj.type;
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
                    message: 'User not an admin',
                })
            }
        }

        var params = {
            TableName: 'Services',
            ProjectionExpression: '#subtype',
            FilterExpression: '#gender = :this_gender AND #type = :this_type',
            ExpressionAttributeValues: {':this_gender': GENDER, ':this_type': TYPE},
            ExpressionAttributeNames: {'#gender': 'gender', '#type': 'type', '#subtype': 'subtype'},
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length == 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    message: 'No Subtypes found'
                })
            }
        } else {

            var subtype = [];
            for(var i=0;i<data.Items.length;i++) {
                subtype.push(data.Items[i].subtype);
            }

            var unique_subtype = subtype.filter((v, i, a) => a.indexOf(v) === i);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Subtypes found',
                    data: unique_subtype
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.getservicebygender = async (event) => {
    try {

        var GENDER = event.pathParameters.gender;
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
                    message: 'User not an admin',
                })
            }
        }

        var params = {
            TableName: 'Services',
            ProjectionExpression: '#type',
            FilterExpression: '#gender = :this_gender',
            ExpressionAttributeValues: {':this_gender': GENDER},
            ExpressionAttributeNames: {'#gender': 'gender', '#type': 'type'},
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length == 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    message: 'No Types found'
                })
            }
        } else {

            var type = [];
            for(var i=0;i<data.Items.length;i++) {
                type.push(data.Items[i].type);
            }

            var unique_type = type.filter((v, i, a) => a.indexOf(v) === i);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Types found',
                    data: unique_type
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}


