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

        if(exist1.user.role != 'barber') {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Not a barber',
                })
            }
        }


        var params = {
            TableName: 'Bookings',
            FilterExpression: '#barberId = :this_barber',
            ExpressionAttributeValues: {':this_barber': exist1.user.id},
            ExpressionAttributeNames: {
                '#barberId': 'barberId',
            },
        }

        try {
            var data = await documentClient.scan(params).promise();
            var data1;
            var info;
            var day1;
            var today1;

            for(var i=0;i<data.Items.length;i++) {

                info = data.Items[i].serviceId.split(',');
                params = {
                    TableName: 'Services',
                    Key:{
                        id: info[0]
                    },
                    ProjectionExpression: "#name, #price, #time, #category",
                    ExpressionAttributeNames: {
                        "#name": "name",
                        "#price": "price",
                        "#time": "time",
                        "#category": "category",
                    }
                }

                data1 = await documentClient.get(params).promise();

                data.Items[i].service = data1.Item;

                data.Items[i].distance = await getDistance(data.Items[i].user_lat,data.Items[i].user_long,exist1.user.latitude,exist1.user.longitude);

                console.log(data.Items[i].date);
                day1 = data.Items[i].date.split('-');
                today1 = new Date(Number(day1[2]),Number(day1[1]),Number(day1[0]),Number(data.Items[i].slot));
                data.Items[i].booktime = today1.getTime();
            }

            var today = new Date();
            var now;
            today.setHours(today.getHours() + 5);
            today.setMinutes(today.getMinutes() + 30);

            var done = data.Items.filter((item) => {
                now = new Date(item.booktime);
                return item.service_status === 'done' && today.getDate()-now.getDate() >= 30;
            });

            var not_done = data.Items.filter((item) => {
                return item.service_status !== 'done';
            })

            done.sort((a,b) => {
                if(a.booktime < b.booktime) {
                    return 1;
                } else if(a.booktime > b.booktime) {
                    return -1;
                } else {
                    return 0;
                }
            })

            not_done.sort((a,b) => {
                if(a.booktime < b.booktime) {
                    return -1;
                } else if(a.booktime > b.booktime) {
                    return 1;
                } else {
                    return 0;
                }
            })

            if(!exist1.user.mode) {
                exist1.user.mode = '';
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Bookings found',
                    done: done,
                    not_done: not_done,
                    mode: exist1.user.mode
                })
            }

        } catch(err) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Bookings not found'
                })
            }
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}