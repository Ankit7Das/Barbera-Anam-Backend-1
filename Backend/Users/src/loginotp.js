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
                                            '1000': 'n',
                                            '1010': 'n',
                                            '1020': 'n',
                                            '1030': 'n',
                                            '1040': 'n',
                                            '1050': 'n',
                                            '1100': 'n',
                                            '1110': 'n',
                                            '1120': 'n',
                                            '1130': 'n',
                                            '1140': 'n',
                                            '1150': 'n',
                                            '1200': 'n',
                                            '1210': 'n',
                                            '1220': 'n',
                                            '1230': 'n',
                                            '1240': 'n',
                                            '1250': 'n',
                                            '1300': 'n',
                                            '1310': 'n',
                                            '1320': 'n',
                                            '1330': 'n',
                                            '1340': 'n',
                                            '1350': 'n',
                                            '1400': 'n',
                                            '1410': 'n',
                                            '1420': 'n',
                                            '1430': 'n',
                                            '1440': 'n',
                                            '1450': 'n',
                                            '1500': 'n',
                                            '1510': 'n',
                                            '1520': 'n',
                                            '1530': 'n',
                                            '1540': 'n',
                                            '1550': 'n',
                                            '1600': 'n',
                                            '1610': 'n',
                                            '1620': 'n',
                                            '1630': 'n',
                                            '1640': 'n',
                                            '1650': 'n',
                                            '1700': 'n',
                                            '1710': 'n',
                                            '1720': 'n',
                                            '1730': 'n',
                                            '1740': 'n',
                                            '1750': 'n',
                                            '1800': 'n',
                                            '1810': 'n',
                                            '1820': 'n',
                                            '1830': 'n',
                                            '1840': 'n',
                                            '1850': 'n',
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day2,
                                            barberId: id,
                                            '1000': 'n',
                                            '1010': 'n',
                                            '1020': 'n',
                                            '1030': 'n',
                                            '1040': 'n',
                                            '1050': 'n',
                                            '1100': 'n',
                                            '1110': 'n',
                                            '1120': 'n',
                                            '1130': 'n',
                                            '1140': 'n',
                                            '1150': 'n',
                                            '1200': 'n',
                                            '1210': 'n',
                                            '1220': 'n',
                                            '1230': 'n',
                                            '1240': 'n',
                                            '1250': 'n',
                                            '1300': 'n',
                                            '1310': 'n',
                                            '1320': 'n',
                                            '1330': 'n',
                                            '1340': 'n',
                                            '1350': 'n',
                                            '1400': 'n',
                                            '1410': 'n',
                                            '1420': 'n',
                                            '1430': 'n',
                                            '1440': 'n',
                                            '1450': 'n',
                                            '1500': 'n',
                                            '1510': 'n',
                                            '1520': 'n',
                                            '1530': 'n',
                                            '1540': 'n',
                                            '1550': 'n',
                                            '1600': 'n',
                                            '1610': 'n',
                                            '1620': 'n',
                                            '1630': 'n',
                                            '1640': 'n',
                                            '1650': 'n',
                                            '1700': 'n',
                                            '1710': 'n',
                                            '1720': 'n',
                                            '1730': 'n',
                                            '1740': 'n',
                                            '1750': 'n',
                                            '1800': 'n',
                                            '1810': 'n',
                                            '1820': 'n',
                                            '1830': 'n',
                                            '1840': 'n',
                                            '1850': 'n',
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day3,
                                            barberId: id,
                                            '1000': 'n',
                                            '1010': 'n',
                                            '1020': 'n',
                                            '1030': 'n',
                                            '1040': 'n',
                                            '1050': 'n',
                                            '1100': 'n',
                                            '1110': 'n',
                                            '1120': 'n',
                                            '1130': 'n',
                                            '1140': 'n',
                                            '1150': 'n',
                                            '1200': 'n',
                                            '1210': 'n',
                                            '1220': 'n',
                                            '1230': 'n',
                                            '1240': 'n',
                                            '1250': 'n',
                                            '1300': 'n',
                                            '1310': 'n',
                                            '1320': 'n',
                                            '1330': 'n',
                                            '1340': 'n',
                                            '1350': 'n',
                                            '1400': 'n',
                                            '1410': 'n',
                                            '1420': 'n',
                                            '1430': 'n',
                                            '1440': 'n',
                                            '1450': 'n',
                                            '1500': 'n',
                                            '1510': 'n',
                                            '1520': 'n',
                                            '1530': 'n',
                                            '1540': 'n',
                                            '1550': 'n',
                                            '1600': 'n',
                                            '1610': 'n',
                                            '1620': 'n',
                                            '1630': 'n',
                                            '1640': 'n',
                                            '1650': 'n',
                                            '1700': 'n',
                                            '1710': 'n',
                                            '1720': 'n',
                                            '1730': 'n',
                                            '1740': 'n',
                                            '1750': 'n',
                                            '1800': 'n',
                                            '1810': 'n',
                                            '1820': 'n',
                                            '1830': 'n',
                                            '1840': 'n',
                                            '1850': 'n',
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day4,
                                            barberId: id,
                                            '1000': 'n',
                                            '1010': 'n',
                                            '1020': 'n',
                                            '1030': 'n',
                                            '1040': 'n',
                                            '1050': 'n',
                                            '1100': 'n',
                                            '1110': 'n',
                                            '1120': 'n',
                                            '1130': 'n',
                                            '1140': 'n',
                                            '1150': 'n',
                                            '1200': 'n',
                                            '1210': 'n',
                                            '1220': 'n',
                                            '1230': 'n',
                                            '1240': 'n',
                                            '1250': 'n',
                                            '1300': 'n',
                                            '1310': 'n',
                                            '1320': 'n',
                                            '1330': 'n',
                                            '1340': 'n',
                                            '1350': 'n',
                                            '1400': 'n',
                                            '1410': 'n',
                                            '1420': 'n',
                                            '1430': 'n',
                                            '1440': 'n',
                                            '1450': 'n',
                                            '1500': 'n',
                                            '1510': 'n',
                                            '1520': 'n',
                                            '1530': 'n',
                                            '1540': 'n',
                                            '1550': 'n',
                                            '1600': 'n',
                                            '1610': 'n',
                                            '1620': 'n',
                                            '1630': 'n',
                                            '1640': 'n',
                                            '1650': 'n',
                                            '1700': 'n',
                                            '1710': 'n',
                                            '1720': 'n',
                                            '1730': 'n',
                                            '1740': 'n',
                                            '1750': 'n',
                                            '1800': 'n',
                                            '1810': 'n',
                                            '1820': 'n',
                                            '1830': 'n',
                                            '1840': 'n',
                                            '1850': 'n',
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day5,
                                            barberId: id,
                                            '1000': 'n',
                                            '1010': 'n',
                                            '1020': 'n',
                                            '1030': 'n',
                                            '1040': 'n',
                                            '1050': 'n',
                                            '1100': 'n',
                                            '1110': 'n',
                                            '1120': 'n',
                                            '1130': 'n',
                                            '1140': 'n',
                                            '1150': 'n',
                                            '1200': 'n',
                                            '1210': 'n',
                                            '1220': 'n',
                                            '1230': 'n',
                                            '1240': 'n',
                                            '1250': 'n',
                                            '1300': 'n',
                                            '1310': 'n',
                                            '1320': 'n',
                                            '1330': 'n',
                                            '1340': 'n',
                                            '1350': 'n',
                                            '1400': 'n',
                                            '1410': 'n',
                                            '1420': 'n',
                                            '1430': 'n',
                                            '1440': 'n',
                                            '1450': 'n',
                                            '1500': 'n',
                                            '1510': 'n',
                                            '1520': 'n',
                                            '1530': 'n',
                                            '1540': 'n',
                                            '1550': 'n',
                                            '1600': 'n',
                                            '1610': 'n',
                                            '1620': 'n',
                                            '1630': 'n',
                                            '1640': 'n',
                                            '1650': 'n',
                                            '1700': 'n',
                                            '1710': 'n',
                                            '1720': 'n',
                                            '1730': 'n',
                                            '1740': 'n',
                                            '1750': 'n',
                                            '1800': 'n',
                                            '1810': 'n',
                                            '1820': 'n',
                                            '1830': 'n',
                                            '1840': 'n',
                                            '1850': 'n',
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day6,
                                            barberId: id,
                                            '1000': 'n',
                                            '1010': 'n',
                                            '1020': 'n',
                                            '1030': 'n',
                                            '1040': 'n',
                                            '1050': 'n',
                                            '1100': 'n',
                                            '1110': 'n',
                                            '1120': 'n',
                                            '1130': 'n',
                                            '1140': 'n',
                                            '1150': 'n',
                                            '1200': 'n',
                                            '1210': 'n',
                                            '1220': 'n',
                                            '1230': 'n',
                                            '1240': 'n',
                                            '1250': 'n',
                                            '1300': 'n',
                                            '1310': 'n',
                                            '1320': 'n',
                                            '1330': 'n',
                                            '1340': 'n',
                                            '1350': 'n',
                                            '1400': 'n',
                                            '1410': 'n',
                                            '1420': 'n',
                                            '1430': 'n',
                                            '1440': 'n',
                                            '1450': 'n',
                                            '1500': 'n',
                                            '1510': 'n',
                                            '1520': 'n',
                                            '1530': 'n',
                                            '1540': 'n',
                                            '1550': 'n',
                                            '1600': 'n',
                                            '1610': 'n',
                                            '1620': 'n',
                                            '1630': 'n',
                                            '1640': 'n',
                                            '1650': 'n',
                                            '1700': 'n',
                                            '1710': 'n',
                                            '1720': 'n',
                                            '1730': 'n',
                                            '1740': 'n',
                                            '1750': 'n',
                                            '1800': 'n',
                                            '1810': 'n',
                                            '1820': 'n',
                                            '1830': 'n',
                                            '1840': 'n',
                                            '1850': 'n',
                                        }
                                    }
                                },
                                {
                                    PutRequest: {
                                        Item: {
                                            date: day7,
                                            barberId: id,
                                            '1000': 'n',
                                            '1010': 'n',
                                            '1020': 'n',
                                            '1030': 'n',
                                            '1040': 'n',
                                            '1050': 'n',
                                            '1100': 'n',
                                            '1110': 'n',
                                            '1120': 'n',
                                            '1130': 'n',
                                            '1140': 'n',
                                            '1150': 'n',
                                            '1200': 'n',
                                            '1210': 'n',
                                            '1220': 'n',
                                            '1230': 'n',
                                            '1240': 'n',
                                            '1250': 'n',
                                            '1300': 'n',
                                            '1310': 'n',
                                            '1320': 'n',
                                            '1330': 'n',
                                            '1340': 'n',
                                            '1350': 'n',
                                            '1400': 'n',
                                            '1410': 'n',
                                            '1420': 'n',
                                            '1430': 'n',
                                            '1440': 'n',
                                            '1450': 'n',
                                            '1500': 'n',
                                            '1510': 'n',
                                            '1520': 'n',
                                            '1530': 'n',
                                            '1540': 'n',
                                            '1550': 'n',
                                            '1600': 'n',
                                            '1610': 'n',
                                            '1620': 'n',
                                            '1630': 'n',
                                            '1640': 'n',
                                            '1650': 'n',
                                            '1700': 'n',
                                            '1710': 'n',
                                            '1720': 'n',
                                            '1730': 'n',
                                            '1740': 'n',
                                            '1750': 'n',
                                            '1800': 'n',
                                            '1810': 'n',
                                            '1820': 'n',
                                            '1830': 'n',
                                            '1840': 'n',
                                            '1850': 'n',
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

                    try {
                        data = await documentClient.update(params).promise();
    
                        var user = {
                            id: id,
                        }
            
                        token = jwt.sign(user, JWT_SECRET, { expiresIn: new Date().setDate(new Date().getDate() + 30) });

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
                            }
                        }
            
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
                                message: 'User not allowed to enter'
                            })
                        }
                    }    
                    
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