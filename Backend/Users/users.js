require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-1' });
const jwt = require("jsonwebtoken");
const { userVerifier, dateSyn } = require("./authentication");
const { hashPassword, matchPassword } = require("./password");
var { Buffer } = require('buffer');
const { JWT_SECRET } = process.env;
const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});
var fileType = require('file-type');

const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];

exports.register = async (event) => {
    try {
        var obj = JSON.parse(event.body);

        var EMAIL = obj.email;
        var NAME = obj.name;
        var ADD = obj.address;
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
        if(obj.mime && obj.image) {
            if(exist1.user.pic) {
                url = new URL(exist1.user.pic);
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
    
            var name = userID.id;
            var key = `${name}.${detectedExt}`;
    
            console.log(`writing image to bucket called ${key}`);
    
            await s3
                .upload({
                    Body: buffer,
                    Key: `profiles/${key}`,
                    ContentType: obj.mime,
                    Bucket: 'barbera-images',
                    ACL: 'public-read',
                })
                .promise();

            url = `https://barbera-images.s3-ap-southeast-1.amazonaws.com/profiles/${key}`;
    
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

exports.getuser = async (event) => {
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

        var params = {
            TableName: 'Users',
            Key: {
                id: userID.id,
            }
        }

        var data = await documentClient.get(params).promise();

        if (!data.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'User does not exist'
                })
            };
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'User found',
                    name: data.Item.name,
                    email: data.Item.email,
                    phone: data.Item.phone,
                    address: data.Item.address,
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.addupdate = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var ADD = obj.address;
        var LONG = obj.longitude;
        var LAT = obj.latitude;
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

        if(exist1 == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'User not found',
                    succes: false,
                })
            }
        }

        var params = {
            TableName: 'Users',
            Key: {
                id: userID.id,
            },
            UpdateExpression: "set #address=:a, #long=:lo, #lat=:la",
            ExpressionAttributeNames: {
                '#address': 'address',
                '#long': 'longitude',
                '#lat': 'latitude'
            },
            ExpressionAttributeValues:{
                ":a": ADD,
                ":lo": LONG,
                ":la": LAT
            },
            ReturnValues:"UPDATED_NEW"
        };

        var data;
        var msg;

        try {
            data = await documentClient.update(params).promise();
            msg = 'User info updated successfully';

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: msg
                })
            };
        } catch(err) {
            msg = err;
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: msg,
                })
            };
        }

    }catch(err) {
        console.log(err);
        return err;
    }
}


exports.loginphone = async(event) => {
    try {
        var obj = JSON.parse(event.body);

        var PHONE = obj.phone;

        var params = {
            TableName: 'Users',
            FilterExpression: '#phone = :this_phone',
            ExpressionAttributeValues: {':this_phone': PHONE},
            ExpressionAttributeNames: {'#phone': 'phone'}
        };
        
        var data = await documentClient.scan(params).promise();
        var random = Math.floor(100000 + Math.random() * 900000);
        // var random1 = Math.round((Math.pow(36, 6 + 1) - Math.random() * Math.pow(36, 6))).toString(36).slice(1);

        if(!data.Items[0]) {
            var ID = uuid.v1();

            params = {
                TableName: 'Users',
                Item: {
                    id: ID,
                    phone: PHONE,
                    otp: random,
                }
            }

            try {
                data = await documentClient.put(params).promise();
            } catch(err) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        success: false,
                        message: err,
                    })
                };
            }

        } else {

            params = {
                TableName: 'Users',
                Key: {
                    id: data.Items[0].id,
                },
                UpdateExpression: "set #otp=:o ",
                ExpressionAttributeNames: {
                    '#otp': 'otp',
                },
                ExpressionAttributeValues:{
                    ":o": random,
                },
                ReturnValues:"UPDATED_NEW"
            };
    
            try {
                data = await documentClient.update(params).promise();
            } catch(err) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        success: false,
                        message: err,
                    })
                };
            }
            
        }
    
        var user = {
            phone: PHONE,
        }

        var token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });

        var msg = `${random} is your verification code for Barbera: Salon Service at your Home.`;

        random = null; 

        params = {
            Message: msg,
            PhoneNumber: '+91' + PHONE,
        };
    
        var sms = await sns.publish(params).promise();
    
        if(sms.MessageId) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    messageId: sms.MessageId,
                    token: token,
                })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    messageSuccess: false,
                })
            };
        }
    } catch(err) {
        console.log(err);
        return err;
    }

}

exports.loginotp = async (event) => {
    try {

        var obj = JSON.parse(event.body);

        var OTP = obj.otp;
        var ROLE = obj.role;
        var ADD = obj.address;
        var LONG = obj.longitude;
        var LAT = obj.latitude;
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

        var params = {
            TableName: 'Users',
            FilterExpression: '#phone = :this_phone',
            ExpressionAttributeValues: {':this_phone': userID.phone},
            ExpressionAttributeNames: {'#phone': 'phone'}
        };
        
        var data = await documentClient.scan(params).promise();

        if(!data.Items[0]) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    succes: false,
                    message: 'Invalid token entered'
                })
            };
        } else {
            var otp = data.Items[0].otp;
            var id = data.Items[0].id;

            if(`${otp}` == OTP){

                if(ROLE == 'barber' && !data.Items[0].role) {

                    var today = new Date();
                    var dd = String(today.getDate()).padStart(2, '0');
                    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                    var yyyy = today.getFullYear();
                    var day1 = dd + '-' + mm + '-' + yyyy;

                    today.setDate(today.getDate() + 1);
                    dd = String(today.getDate()).padStart(2, '0');
                    mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                    yyyy = today.getFullYear();
                    var day2 = dd + '-' + mm + '-' + yyyy;

                    today.setDate(today.getDate() + 1);
                    dd = String(today.getDate()).padStart(2, '0');
                    mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                    yyyy = today.getFullYear();
                    var day3 = dd + '-' + mm + '-' + yyyy;

                    today.setDate(today.getDate() + 1);
                    dd = String(today.getDate()).padStart(2, '0');
                    mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                    yyyy = today.getFullYear();
                    var day4 = dd + '-' + mm + '-' + yyyy;

                    today.setDate(today.getDate() + 1);
                    dd = String(today.getDate()).padStart(2, '0');
                    mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                    yyyy = today.getFullYear();
                    var day5 = dd + '-' + mm + '-' + yyyy;

                    today.setDate(today.getDate() + 1);
                    dd = String(today.getDate()).padStart(2, '0');
                    mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                    yyyy = today.getFullYear();
                    var day6 = dd + '-' + mm + '-' + yyyy;

                    today.setDate(today.getDate() + 1);
                    dd = String(today.getDate()).padStart(2, '0');
                    mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                    yyyy = today.getFullYear();
                    var day7 = dd + '-' + mm + '-' + yyyy;

                    params = {
                        RequestItems: {
                            'BarbersLog': [
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day1,
                                            barberId: id,
                                            '10': false,
                                            '11': false,
                                            '12': false,
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day2,
                                            barberId: id,
                                            '10': false,
                                            '11': false,
                                            '12': false,
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day3,
                                            barberId: id,
                                            '10': false,
                                            '11': false,
                                            '12': false,
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day4,
                                            barberId: id,
                                            '10': true,
                                            '11': false,
                                            '12': false,
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day5,
                                            barberId: id,
                                            '10': false,
                                            '11': false,
                                            '12': false,
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day6,
                                            barberId: id,
                                            '10': false,
                                            '11': false,
                                            '12': false,
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day7,
                                            barberId: id,
                                            '10': false,
                                            '11': false,
                                            '12': false,
                                        }
                                    }
                                },
                            ]
                        }
                    };

                    try {
                        data = await documentClient.batchWrite(params).promise();
                    } catch(err) {
                        return {
                            statusCode: 500,
                            body: JSON.stringify({
                                success: false,
                                message: err,
                            })
                        };
                    }
                }

                if(!data.Items[0].role) {

                    params = {
                        TableName: 'Users',
                        Key: {
                            id: id,
                        },
                        UpdateExpression: "set #otp=:o, #role=:r, #address=:a, #long=:lo, #lat=:la",
                        ExpressionAttributeNames: {
                            '#otp': 'otp',
                            '#role': 'role',
                            '#address': 'address',
                            '#long': 'longitude',
                            '#lat': 'latitude'
                        },
                        ExpressionAttributeValues:{
                            ":o": null,
                            ":r": ROLE,
                            ":a": ADD,
                            ":lo": LONG,
                            ":la": LAT
                        },
                        ReturnValues:"UPDATED_NEW"
                    };
            
                    try {
                        data = await documentClient.update(params).promise();
                    } catch(err) {
                        return {
                            statusCode: 500,
                            body: JSON.stringify({
                                success: false,
                                message: err,
                            })
                        };
                    }
                } else {
    
                    params = {
                        TableName: 'Users',
                        Key: {
                            id: id,
                        },
                        UpdateExpression: "set #otp=:o",
                        ExpressionAttributeNames: {
                            '#otp': 'otp',
                        },
                        ExpressionAttributeValues:{
                            ":o": null,
                        },
                        ReturnValues:"UPDATED_NEW"
                    };
            
                    try {
                        data = await documentClient.update(params).promise();
                    } catch(err) {
                        return {
                            statusCode: 500,
                            body: JSON.stringify({
                                success: false,
                                message: err,
                            })
                        };
                    }
                }

                var user = {
                    id: id,
                }
    
                token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });
    
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'Login/Signup Success',
                        token: token,
                    })
                };

            } else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        succes: false,
                        message: 'Wrong OTP'
                    })
                };
            }

        }

    } catch(err) {
        console.log(err);
        return err;
    }
    
}