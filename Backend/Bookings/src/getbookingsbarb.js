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
            ProjectionExpression: '#serviceId, #userId, #Timestamp, #payment_status, #user_long, #user_lat, #user_add, #date, #slot, #quantity',
            FilterExpression: '#barberId = :this_barber',
            ExpressionAttributeValues: {':this_barber': exist1.user.id},
            ExpressionAttributeNames: {
                '#barberId': 'barberId',
                '#serviceId': 'serviceId', 
                '#userId': 'userId', 
                '#date': 'date', 
                '#payment_status':'payment_status', 
                '#user_long':'user_long', 
                '#user_lat':'user_lat', 
                '#user_add':'user_add',
                '#slot':'slot',
                '#quantity':'quantity',
                '#Timestamp':'Timestamp'
            },
        }

        try {
            var data = await documentClient.scan(params).promise();
            var data1;
            var info;

            for(var i=0;i<data.Items.length;i++) {

                info = data.Items[i].serviceId.split(',');
                params = {
                    TableName: 'Services',
                    Key:{
                        id: info[0]
                    },
                    ProjectionExpression: "#name, #price, #time, #gender",
                    ExpressionAttributeNames: {
                        "#name": "name",
                        "#price": "price",
                        "#time": "time",
                        "#gender": "gender",
                    }
                }

                data1 = await documentClient.get(params).promise();

                delete data.Items[i].serviceId;
                data.Items[i].service = data1.Item;

                delete data.Items[i].userId;

                data.Items[i].distance = await getDistance(data.Items[i].user_lat,data.Items[i].user_long,exist1.user.latitude,exist1.user.longitude);
            }

            data.Items.sort((a,b) => {
                if(a.Timestamp > b.Timestamp) {
                    return -1;
                }else if(a.Timestamp < b.Timestamp) {
                    return 1;
                }else {
                    return 0;
                }
            });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Bookings found',
                    data: data.Items,
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