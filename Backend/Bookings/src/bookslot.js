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
        var DATE = event.pathParameters.date;
        var SLOT = event.pathParameters.slot;
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
        var prices = [];
        var total_price = 0;
        var total_time = 0;
        for(var i=0;i<service.length;i++) {
            
            exist2 = await serviceVerifier(service[i].serviceId);

            if(exist2.success == false) {
                break;
            }

            prices.push(service[i].price);
            total_time+=Number(exist2.service.time);
        }

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Service not found',
                })
            }
        }

        var today = new Date();
        today.setHours(today.getHours() + 5);
        today.setMinutes(today.getMinutes() + 30);
        var now = new Date();
        now.setHours(now.getHours() + 5);
        now.setMinutes(now.getMinutes() + 30);

        console.log(Number(SLOT));
        console.log(Number(today.getHours()));

        var date1 = DATE.split('-');

        var date = new Date(date1[2],date1[1],date1[0]);

        console.log(Number(date.getDate()));
        console.log(Number(today.getDate()));

        var slot = Number(SLOT) - 10;

        if(slot%100 === 90) {
            slot = ((slot/100))*100 + 50;
        }

        if(slot === 950) {
            slot = 1000;
            SLOT = String(slot);
        } else {
            SLOT = String(slot);
            total_time += 10;
        }

        console.log("slot",slot);
        console.log("SLOT",SLOT);

        if(date.getDate()<today.getDate()) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Date chosen is not possible'
                })
            };
        }

        if(date.getDate()===today.getDate()) {
            if(slot/100 <= Number(today.getHours())) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'Slot chosen is not possible'
                    })
                };
            } else if(slot/100 === Number(today.getHours())) {
                if(slot%100 <= Number(today.getMinutes())) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Slot chosen is not possible'
                        })
                    }
                }
            }
        }

        var params = {
            TableName: 'BarbersLog',
            KeyConditionExpression: '#date = :d',
            FilterExpression: '#slot = :s',
            ExpressionAttributeValues: {
                ':d': DATE,
                ':s': 'n',
            },
            ExpressionAttributeNames: {
                '#date': 'date',
                '#slot': SLOT,
            }
        }

        try {
            var data = await documentClient.query(params).promise();

            console.log(data.Items);

            // var slot = Number(SLOT) - 10;

            // if(slot%100 === 0) {
            //     if(slot === 950) {
            //         slot += 10;
            //     } else {
            //         slot = (slot/100)*100 + 60;
            //     }
            // }

            var cnt = 0;

            for(var i = slot ; ; i += 10) {

                cnt++;

                data.Items = data.Items.filter((barber) => {
                    return barber[String(i)] === 'n';
                });
                
                if(i % 100 === 50) {
                    i += 40;
                } 

                if(cnt > Math.ceil(total_time/10)) {
                    break;
                }
                
            }

            console.log(data.Items);

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
                    ProjectionExpression: 'id, longitude, latitude, coins'
                }

                data1 = await documentClient.get(params).promise();
                data1.Item.distance = await getDistance(lat1,long1,data1.Item.latitude,data1.Item.longitude);

                if(data1.Item.coins >= 300 && data1.Item.distance<=10) {
                    barbers.push(data1.Item);
                } else {
                    continue;
                }
            }

            console.log(barbers);

            barbers.sort((a, b) => {
                if(a.distance>b.distance) {
                    return 1;
                }else if(a.distance<b.distance) {
                    return -1;
                }else {
                    return 0;
                }
            });

            console.log(barbers);

            if(barbers.length === 0) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: false,
                        message: 'Booking unsuccessful'
                    })
                }
            } else {
                var barberId = barbers[0].id;
                var coins = barbers[0].coins;

                params = {
                    TableName: 'BarbersLog',
                    Key: {
                        date: DATE,
                        barberId: barberId
                    }
                };
        
                try {
                    data = await documentClient.get(params).promise();

                    console.log(data.Item);
        
                    var timestamp = now.getTime(); 

                    for(var i=0;i<service.length;i++){

                        params = {
                            TableName: 'Bookings',
                            Item: {
                                userId: exist1.user.id,
                                serviceId: service[i].serviceId + ',' + timestamp,
                                barberId: barberId,
                                Timestamp: timestamp,
                                user_long: exist1.user.longitude,
                                user_lat: exist1.user.latitude,
                                user_add: exist1.user.address,
                                amount: prices[i],
                                payment_status: 'pending',
                                service_status: 'pending',
                                date: DATE,
                                slot: SLOT,
                                quantity: service[i].quantity
                            }
                        };

                        data = await documentClient.put(params).promise();

                        total_price += Number(prices[i]);
                    }

                    var percentage = 0.1;            

                    params = {
                        TableName: 'Users',
                        Key: {
                            id: barberId,
                        },
                        UpdateExpression: "set #coins=#coins - :c",
                        ExpressionAttributeNames: {
                            '#coins': 'coins', 
                        },
                        ExpressionAttributeValues:{
                            ":c": percentage*coins,
                        },
                        ReturnValues:"UPDATED_NEW"
                    }

                    
                    data = await documentClient.update(params).promise();

                    // slot = Number(SLOT) - 10;

                    // if(slot%100 === 0) {
                    //     slot = (slot/100)*100 + 60;
                    // }

                    cnt = 0;

                    for(var i = slot ; ; i += 10) {

                        cnt++;

                        params = {
                            TableName: 'BarbersLog',
                            Key: {
                                date: DATE,
                                barberId: barberId
                            },
                            UpdateExpression: "set #slot=:s",
                            ExpressionAttributeNames: {
                                '#slot': String(i), 
                            },
                            ExpressionAttributeValues:{
                                ":s": 'b',
                            },
                            ReturnValues:"UPDATED_NEW"
                        }
            
                        data = await documentClient.update(params).promise();

                        if(i % 100 === 50) {
                            i += 40;
                        }

                        if(cnt > Math.ceil(total_time/10)) {
                            break;
                        }
                        
                    }

                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            success: true,
                            message: 'Booking successful',
                        })
                    }

                }catch(err) {
                    console.log("Error: ", err);
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Booking unsuccessful',
                        })
                    };
                }
            }

        } catch(err) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Barbers not found'
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}