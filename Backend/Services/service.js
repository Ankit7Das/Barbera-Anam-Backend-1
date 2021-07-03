require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-1' });
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


exports.addservice = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var ID = uuid.v1();
        var NAME = obj.name;
        var PRICE = obj.price;
        var TIME = obj.time;
        var DET = obj.details;
        var DISC = obj.discount;
        var DOD = obj.dod;
        var GENDER = obj.gender;
        var TYPE = obj.type;
        var SUBTYPE = obj.subtype;
        var TREND = obj.trending;
        var token = event.headers.token;

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

        if (!obj.image || !obj.mime) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'incorrect body on request'
                })
            };
        }

        if (!allowedMimes.includes(obj.mime)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'mime is not allowed '
                })
            };
        }

        let imageData = obj.image;
        if (obj.image.substr(0, 7) === 'base64,') {
            imageData = obj.image.substr(7, obj.image.length);
        }

        const buffer = Buffer.from(imageData, 'base64');
        const fileInfo = await fileType.fromBuffer(buffer);
        const detectedExt = fileInfo.ext;
        const detectedMime = fileInfo.mime;

        if (detectedMime !== obj.mime) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'mime types dont match'
                })
            };
        }

        const name = ID;
        const key = `${name}.${detectedExt}`;

        console.log(`writing image to bucket called ${key}`);

        await s3
            .upload({
                Body: buffer,
                Key: `services/${key}`,
                ContentType: obj.mime,
                Bucket: 'barbera-images',
                ACL: 'public-read',
            })
            .promise();

        const url = `https://barbera-images.s3-ap-southeast-1.amazonaws.com/services/${key}`;

        var params = {
            TableName: 'Services',
            Item: {
                id: ID,
                name: NAME,
                price: PRICE,
                time: TIME,
                details: DET ? DET : null,
                discount: DISC ? DISC : null,
                icon: url ? url : null,
                dod: DOD ? DOD : false,
                type: TYPE,
                subtype: SUBTYPE,
                gender: GENDER,
                trending: TREND
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
        var token = event.headers.token;

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
        var token = event.headers.token;
        
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

        var obj = JSON.parse(event.body);
        var ID = obj.id;
        var NAME = obj.name;
        var PRICE = obj.price;
        var TIME = obj.time;
        var DET = obj.details;
        var DISC = obj.discount;
        var DOD = obj.dod;
        var GENDER = obj.gender;
        var TYPE = obj.type;
        var SUBTYPE = obj.subtype;
        var TREND = obj.trending;
        var token = event.headers.token;

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

        if(obj.mime && obj.image) {
            if(exist2.service.icon) {
                var url = new URL(exist2.service.icon);
                var key = url.pathname.substring(1);

                try {
                    await s3
                        .deleteObject({
                            Key: key,
                            Bucket: 'barbera-images'
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

            if (!obj.image || !obj.mime) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'incorrect body on request'
                    })
                };
            }
    
            if (!allowedMimes.includes(obj.mime)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'mime is not allowed '
                    })
                };
            }
    
            let imageData = obj.image;
            if (obj.image.substr(0, 7) === 'base64,') {
                imageData = obj.image.substr(7, obj.image.length);
            }
    
            const buffer = Buffer.from(imageData, 'base64');
            const fileInfo = await fileType.fromBuffer(buffer);
            const detectedExt = fileInfo.ext;
            const detectedMime = fileInfo.mime;
    
            if (detectedMime !== obj.mime) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'mime types dont match'
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
                    ContentType: obj.mime,
                    Bucket: 'barbera-images',
                    ACL: 'public-read',
                })
                .promise();
    
        }

        var params = {
            TableName: 'Services',
            Key: {
                id: ID,
            },
            UpdateExpression: "set #name=:n, #price=:p, #time=:ti, #details=:det, #discount=:dis, #deal=:dod, #type=:t, #subtype=:s, #gender=:g, #trend=:tr",
            ExpressionAttributeNames: {
                '#name': 'name',
                '#price': 'price',
                '#time': 'time',
                '#details': 'details',
                '#discount': 'discount',
                '#deal': 'dod',
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
                ":dis": DISC ? DISC : null,
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

        var token = event.headers.token;

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

        var token = event.headers.token;

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
            FilterExpression: '#trend = :this_trend',
            ExpressionAttributeValues: {':this_trend': true},
            ExpressionAttributeNames: {'#trend': 'trending'}
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length == 0) {
            return {
                statusCode: 404,
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
        var token = event.headers.token;

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
        var token = event.headers.token;

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
                statusCode: 404,
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
        var token = event.headers.token;

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
                statusCode: 404,
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


