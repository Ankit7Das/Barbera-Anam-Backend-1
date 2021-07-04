require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, serviceVerifier } = require("./authentication");
const { getDistance } = require('./helper');


exports.barberbyslot = async (event) => {
    try {

        var DATE = event.pathParameters.date;
        var SLOT = event.pathParameters.slot;
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
                    message: 'User not found',
                    success: false,
                })
            }
        }

        if(exist1.user.role != 'user') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'User not found or user does not have role as user',
                    success: false,
                })
            }
        }

        var params = {
            TableName: 'BarbersLog',
            ProjectionExpression: 'barberId',
            KeyConditionExpression: '#date = :d',
            FilterExpression: '#slot = :s',
            ExpressionAttributeValues: {
                ':d': DATE,
                ':s': false,
            },
            ExpressionAttributeNames: {
                '#date': 'date',
                '#slot': SLOT,
            }
        }

        try {
            var data = await documentClient.query(params).promise();

            var data1;
            var barbers = [];
            var long1 = exist1.user.longitude;
            var lat1 = exist1.user.latitude;

            for(var i=0;i<data.Items.length;i++){
                params = {
                    TableName: 'Users',
                    Key: {
                        id: data.Items[i].barberId,
                    },
                    ProjectionExpression: 'id, address, phone, longitude, latitude'
                }

                data1 = await documentClient.get(params).promise();
                data1.Item.distance = await getDistance(lat1,long1,data1.Item.latitude,data1.Item.longitude);

                barbers.push(data1.Item);
            }

            barbers.sort((a, b) => {
                if(a.distance>b.distance) {
                    return 1;
                }else if(a.distance<b.distance) {
                    return -1;
                }else {
                    return 0;
                }
            });

            for(var i=0;i<barbers.length;i++){
                delete barbers[i].longitude;
                delete barbers[i].latitude;
                delete barbers[i].distance;
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'List of free barbers',
                    barbers: barbers,
                })
            }
        } catch(err) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Slot not found'
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.getbookings = async (event) => {
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
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist1.user.role != 'user') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'User does not have role as user',
                })
            }
        }

        var params = {
            TableName: 'Bookings',
            KeyConditionExpression: '#user = :u',
            ExpressionAttributeValues: {
                ':u': userID.id,
            },
            ExpressionAttributeNames: {
                '#user': 'userId'
            }
        }

        try {
            var data = await documentClient.query(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Booking found',
                    data: data.Items,
                })
            }

        } catch(err) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Booking not found'
                })
            }
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.selectbarber = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var barberId = obj.barberid;
        var serviceId = obj.serviceid;
        var DATE = event.pathParameters.date;
        var SLOT = event.pathParameters.slot;
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

        if(exist1.user.role != 'user') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'User does not have role as user',
                })
            }
        }

        var exist3 = await userVerifier(barberId);

        if(exist3.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Barber not found',
                })
            }
        }

        if(exist3.user.role != 'barber') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'User does not have role as barber',
                })
            }
        }

        var exist2;
        for(var i=0;i<serviceId.length;i++) {
            
            exist2 = await serviceVerifier(serviceId[i]);

            if(exist2 == false) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({
                        success: false,
                        message: 'Service not found',
                    })
                }
            }
        }

        var params;
        var data;
        var now = new Date();
        now.setHours(now.getHours() + 5);
        now.setMinutes(now.getMinutes() + 30);
        var timest = now.toLocaleString(); 

        for(var i=0;i<serviceId.length;i++){

            params = {
                TableName: 'Bookings',
                Item: {
                    userId: exist1.user.id,
                    serviceId: serviceId[i],
                    barberId: barberId,
                    Timestamp: timest
                }
            };

            try {
                data = await documentClient.put(params).promise();
            }catch(err) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'Booking unsuccessful'
                    })
                };
            }
        }

        params = {
            TableName: 'BarbersLog',
            Key: {
                date: DATE,
                barberId: barberId,
            },
            UpdateExpression: "set #slot=:s",
            ExpressionAttributeNames: {
                '#slot': SLOT, 
            },
            ExpressionAttributeValues:{
                ":s": true,
            },
            ReturnValues:"UPDATED_NEW"
        }

        try {
            data = await documentClient.update(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Booking successful',
                })
            }
        } catch(err) {
            console.log("Error: ", err);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: err,
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}