require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { userVerifier } = require("./authentication");
const { JWT_SECRET } = process.env;

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);

        var OTP = obj.otp;
        var ROLE = obj.role;
        var ADD = obj.address;
        var LONG = obj.longitude;
        var LAT = obj.latitude;
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
                    success: false,
                    message: 'Invalid token entered'
                })
            };
        } else {
            var otp = data.Items[0].otp;
            var id = data.Items[0].id;

            if(`${otp}` == OTP){

                if(ROLE == 'barber' && !data.Items[0].role) {

                    var today = new Date();
                    today.setHours(today.getHours() + 5);
                    today.setMinutes(today.getMinutes() + 30);
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
                                            '13': false,
                                            '14': false,
                                            '15': false,
                                            '16': false,
                                            '17': false,
                                            '18': false,
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
                                            '13': false,
                                            '14': false,
                                            '15': false,
                                            '16': false,
                                            '17': false,
                                            '18': false,
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
                                            '13': false,
                                            '14': false,
                                            '15': false,
                                            '16': false,
                                            '17': false,
                                            '18': false,
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day4,
                                            barberId: id,
                                            '10': false,
                                            '11': false,
                                            '12': false,
                                            '13': false,
                                            '14': false,
                                            '15': false,
                                            '16': false,
                                            '17': false,
                                            '18': false,
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
                                            '13': false,
                                            '14': false,
                                            '15': false,
                                            '16': false,
                                            '17': false,
                                            '18': false,
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
                                            '13': false,
                                            '14': false,
                                            '15': false,
                                            '16': false,
                                            '17': false,
                                            '18': false,
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
                                            '13': false,
                                            '14': false,
                                            '15': false,
                                            '16': false,
                                            '17': false,
                                            '18': false,
                                        }
                                    }
                                },
                            ]
                        }
                    };

                    try {
                        data = await documentClient.batchWrite(params).promise();

                        params = {
                            TableName: 'Users',
                            Key: {
                                id: id,
                            },
                            UpdateExpression: "set #otp=:o, #role=:r, #address=:a, #long=:lo, #lat=:la, #status=:s, #referral=:ref, #coins=:c",
                            ExpressionAttributeNames: {
                                '#otp': 'otp',
                                '#role': 'role',
                                '#address': 'address',
                                '#long': 'longitude',
                                '#lat': 'latitude',
                                '#status': 'status',
                                '#referral': 'referral',
                                '#coins':'coins'
                            },
                            ExpressionAttributeValues:{
                                ":o": null,
                                ":r": ROLE,
                                ":a": ADD,
                                ":lo": LONG,
                                ":la": LAT,
                                ":s": 'free',
                                ":ref": null,
                                ":c": 0
                            },
                            ReturnValues:"UPDATED_NEW"
                        };
                    } catch(err) {
                        return {
                            statusCode: 500,
                            body: JSON.stringify({
                                success: false,
                                message: err,
                            })
                        };
                    }
                } else if(!data.Items[0].role) {

                    if(ROLE == 'admin') {
                        params = {
                            TableName: 'Users',
                            Key: {
                                id: id,
                            },
                            UpdateExpression: "set #otp=:o, #role=:r",
                            ExpressionAttributeNames: {
                                '#otp': 'otp',
                                '#role': 'role'
                            },
                            ExpressionAttributeValues:{
                                ":o": null,
                                ":r": ROLE
                            },
                            ReturnValues:"UPDATED_NEW"
                        };
                    } else {
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
                }

                try {
                    data = await documentClient.update(params).promise();

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
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
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