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

        console.log(event.headers);
        

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

        if(ROLE === 'admin') {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: "Invalid Request",
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
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
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

                    params = {
                        TableName: 'Users',
                        Key: {
                            id: id,
                        }
                    };

                    data = await documentClient.delete(params).promise();
                    
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Unauthorized barber access'
                        })
                    }
                } else if(!data.Items[0].role) {
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
    
                        var user = {
                            id: id,
                        }
            
                        token = jwt.sign(user, JWT_SECRET, {});

                        if(obj.ref && ROLE == 'user') {
                            params = {
                                TableName: 'Users',
                                FilterExpression: '#referral = :this_referral',
                                ExpressionAttributeValues: {':this_referral': obj.ref},
                                ExpressionAttributeNames: {'#referral': 'referral'}
                            };
            
                            data = await documentClient.scan(params).promise();
        
                            console.log(data);
        
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
                                        message: 'Referral code is invalid'
                                    })
                                }
                            } else {
                                params = {
                                    TableName: 'Users',
                                    Key: {
                                        id: data.Items[0].id,
                                    },
                                    UpdateExpression: "set #invites=#invites + :i",
                                    ExpressionAttributeNames: {
                                        '#invites': 'invites',
                                    },
                                    ExpressionAttributeValues:{
                                        ":i": 1,
                                    },
                                    ReturnValues:"UPDATED_NEW"
                                };
        
                                data = await documentClient.update(params).promise();

                                params = {
                                    TableName: 'Users',
                                    Key: {
                                        id: userID.id,
                                    },
                                    UpdateExpression: "set #invites=#invites + :i",
                                    ExpressionAttributeNames: {
                                        '#invites': 'invites',
                                    },
                                    ExpressionAttributeValues:{
                                        ":i": 1,
                                    },
                                    ReturnValues:"UPDATED_NEW"
                                };
        
                                data = await documentClient.update(params).promise();
                            }
                        }
            
                        return {
                            statusCode: 200,
                            headers: {
                                "Access-Control-Allow-Headers" : "Content-Type",
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                            },
                            body: JSON.stringify({
                                success: true,
                                message: 'Login/Signup Success',
                                token: token,
                            })
                        };
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
                                message: err,
                            })
                        };
                    }
                    
                }  else if (ROLE == 'barber' && !data.Items[0].coins) {

                    if(obj.gender === 'male') {
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
                                                distance: 0,
                                                '6': 'n',
                                                '7': 'n',
                                                '8': 'n',
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                                '18': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day2,
                                                barberId: id,
                                                distance: 0,
                                                '6': 'n',
                                                '7': 'n',
                                                '8': 'n',
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                                '18': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day3,
                                                barberId: id,
                                                distance: 0,
                                                '6': 'n',
                                                '7': 'n',
                                                '8': 'n',
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                                '18': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day4,
                                                barberId: id,
                                                distance: 0,
                                                '6': 'n',
                                                '7': 'n',
                                                '8': 'n',
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                                '18': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day5,
                                                barberId: id,
                                                distance: 0,
                                                '6': 'n',
                                                '7': 'n',
                                                '8': 'n',
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                                '18': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day6,
                                                barberId: id,
                                                distance: 0,
                                                '6': 'n',
                                                '7': 'n',
                                                '8': 'n',
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                                '18': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day7,
                                                barberId: id,
                                                distance: 0,
                                                '6': 'n',
                                                '7': 'n',
                                                '8': 'n',
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                                '18': 'n',
                                            }
                                        }
                                    },
                                ]
                            }
                        };
                    } else {
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
                                                distance: 0,
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day2,
                                                barberId: id,
                                                distance: 0,
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day3,
                                                barberId: id,
                                                distance: 0,
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day4,
                                                barberId: id,
                                                distance: 0,
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day5,
                                                barberId: id,
                                                distance: 0,
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day6,
                                                barberId: id,
                                                distance: 0,
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                            }
                                        }
                                    },
                                    {
                                        PutRequest: {
                                            Item: {
                                                date: day7,
                                                barberId: id,
                                                distance: 0,
                                                '9': 'n',
                                                '10': 'n',
                                                '11': 'n',
                                                '12': 'n',
                                                '13': 'n',
                                                '14': 'n',
                                                '15': 'n',
                                                '16': 'n',
                                                '17': 'n',
                                            }
                                        }
                                    },
                                ]
                            }
                        };
                    }

                    try {
                        var data1 = await documentClient.batchWrite(params).promise();

                        if(!data.Items[0].gender) {
                            params = {
                                TableName: 'Users',
                                Key: {
                                    id: id,
                                },
                                UpdateExpression: "set #otp=:o, #role=:r, #address=:a, #long=:lo, #lat=:la, #referral=:ref, #coins=:c, #gender=:g",
                                ExpressionAttributeNames: {
                                    '#otp': 'otp',
                                    '#role': 'role',
                                    '#address': 'address',
                                    '#long': 'longitude',
                                    '#lat': 'latitude',
                                    '#referral': 'referral',
                                    '#coins':'coins',
                                    '#gender':'gender'
                                },
                                ExpressionAttributeValues:{
                                    ":o": null,
                                    ":r": ROLE,
                                    ":a": ADD,
                                    ":lo": LONG,
                                    ":la": LAT,
                                    ":ref": null,
                                    ":c": 0,
                                    ":g": obj.gender
                                },
                                ReturnValues:"UPDATED_NEW"
                            };
                        } else {
                            params = {
                                TableName: 'Users',
                                Key: {
                                    id: id,
                                },
                                UpdateExpression: "set #otp=:o, #role=:r, #address=:a, #long=:lo, #lat=:la, #referral=:ref, #coins=:c",
                                ExpressionAttributeNames: {
                                    '#otp': 'otp',
                                    '#role': 'role',
                                    '#address': 'address',
                                    '#long': 'longitude',
                                    '#lat': 'latitude',
                                    '#referral': 'referral',
                                    '#coins':'coins'
                                },
                                ExpressionAttributeValues:{
                                    ":o": null,
                                    ":r": ROLE,
                                    ":a": ADD,
                                    ":lo": LONG,
                                    ":la": LAT,
                                    ":ref": null,
                                    ":c": 0
                                },
                                ReturnValues:"UPDATED_NEW"
                            };
                        }

                        try {
                            data = await documentClient.update(params).promise();
        
                            var user = {
                                id: id,
                            }
                
                            token = jwt.sign(user, JWT_SECRET, {});
                
                            return {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Headers" : "Content-Type",
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                                },
                                body: JSON.stringify({
                                    success: true,
                                    message: 'Login/Signup Success',
                                    token: token,
                                })
                            };
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
                                    message: err,
                                })
                            };
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
                                message: err,
                            })
                        };
                    }
                } else {

                    if(ROLE === data.Items[0].role) {
                        if(data.Items[0].role == 'admin') {
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
                        } else {
                            params = {
                                TableName: 'Users',
                                Key: {
                                    id: id,
                                },
                                UpdateExpression: "set #otp=:o, #address=:a, #long=:lo, #lat=:la",
                                ExpressionAttributeNames: {
                                    '#otp': 'otp',
                                    '#address': 'address',
                                    '#long': 'longitude',
                                    '#lat': 'latitude'
                                },
                                ExpressionAttributeValues:{
                                    ":o": null,
                                    ":a": ADD,
                                    ":lo": LONG,
                                    ":la": LAT
                                },
                                ReturnValues:"UPDATED_NEW"
                            };
                        }
    
                        try {
                            data = await documentClient.update(params).promise();
        
                            var user = {
                                id: id,
                            }
                
                            token = jwt.sign(user, JWT_SECRET, {});
                
                            return {
                                statusCode: 200,
                                headers: {
                                    "Access-Control-Allow-Headers" : "Content-Type",
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                                },
                                body: JSON.stringify({
                                    success: true,
                                    message: 'Login/Signup Success',
                                    token: token,
                                })
                            };
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
                                message: 'User not allowed to enter'
                            })
                        }
                    }    
                    
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