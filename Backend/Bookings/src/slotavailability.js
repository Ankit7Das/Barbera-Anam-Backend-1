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


exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var service = obj.service;
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

        if(exist1.user.role != 'user') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Not a user',
                })
            }
        }

        var exist2;
        var gender = 'male';

        for(var i=0; i<service.length; i++) {
            exist2 = await serviceVerifier(service[i].serviceId);

            if(exist2.service.category.startsWith("Women")) {
                gender = 'female';
            }
        }

        var Data = {};

        for(var i=0; i<7; i++) {
            Data[i] = {
                '6': 0,
                '7': 0,
                '8': 0,
                '9': 0,
                '10': 0,
                '11': 0,
                '12': 0,
                '13': 0,
                '14': 0,
                '15': 0,
                '16': 0,
                '17': 0,
                '18': 0,
            }
        }

        console.log(Data);

        var params = {
            TableName: 'Users',
            FilterExpression: '#role = :this_role',
            ExpressionAttributeValues: {':this_role': 'barber'},
            ExpressionAttributeNames: {'#role': 'role'},
        }

        var data = await documentClient.scan(params).promise();

        console.log("before",data.Items);

        data.Items = data.Items.filter((barber) => {
            console.log(barber.gender,gender);
            return barber.gender === gender && barber.status === 'active';
        })

        console.log("after",data.Items);

        params = {
            TableName: 'Stock',
            Key: {
                type: 'Distance',
                name: 'distance'
            }
        }

        var data1 = await documentClient.get(params).promise();

        var distance = data1.Item.distance;
        var dist;

        var now;

        console.log(data.Items);

        for(var i=0; i<data.Items.length; i++) {
            dist = await getDistance(exist1.user.latitude, exist1.user.longitude, data.Items[i].latitude, data.Items[i].longitude);

            if(dist <= distance && data.Items[i].coins >= 300) {

                console.log(data.Items[i]);

                now = new Date();
                now.setHours(now.getHours() + 5);
                now.setMinutes(now.getMinutes() + 30);
                dd = String(now.getDate()).padStart(2, '0');
                mm = String(now.getMonth() + 1).padStart(2, '0'); //January is 0!
                yyyy = now.getFullYear();
                day = dd + '-' + mm + '-' + yyyy;
                
                for(var j=0; j<7; j++) {
                    params = {
                        TableName: 'BarbersLog',
                        Key: {
                            date: day,
                            barberId: data.Items[i].id
                        }
                    }

                    data1 = await documentClient.get(params).promise();

                    console.log(data1.Item);

                    if(data1.Item) {
                        for(var k=6; k<=18; k++) {
                            Data[j][String(k)] = ( Data[j][String(k)] | (data1.Item[String(k)] === 'n' ? 1 : 0));
                        }
                    }

                    console.log(Data);

                    now.setDate(now.getDate() + 1);
                    dd = String(now.getDate()).padStart(2, '0');
                    mm = String(now.getMonth() + 1).padStart(2, '0'); //January is 0!
                    yyyy = now.getFullYear();
                    day = dd + '-' + mm + '-' + yyyy;
                }

            }
        }

        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Slot availability',
                data: Data
            })
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}