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


const groupBy = (array, total_time) => {

    return array.reduce((result, barber) => {
        
        var today = new Date();
        today.setHours(today.getHours() + 5);
        today.setMinutes(today.getMinutes() + 30);
        var now = String(today.getHours()*100 + Math.ceil(today.getMinutes()/10)*10);

        if(Number(now) <= 1000) {
            total_time -= 10;
            today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), '09', '60');
            now = String(today.getHours()*100);
        }


        var cnt = 0;
        var SLOT = Number(now);
        var prev = null;

        console.log(now);
        console.log("SLOT",SLOT);

        var slot = Number(now);

        for( ; slot <= 1850 ; ) {

            console.log("slot",slot);

            if( barber[String(slot)] === 'n' ) {
                if(prev != null){
                    if(barber[String(prev)] !== 'n') {
                        SLOT = slot;
                    }
                }
                cnt++;
            }else {

                if(cnt >= Math.ceil(total_time/10)) {
                    (result[SLOT] = result[SLOT] || []).push(
                        barber
                    );
                    break;
                }

                cnt = 0;
            }

            console.log("cnt",cnt);
            console.log("tot",total_time);

            if(cnt >= Math.ceil(total_time/10)) {
                (result[SLOT] = result[SLOT] || []).push(
                    barber
                );
                break;
            }

            prev = slot;
            today.setMinutes(today.getMinutes() + 10);
            slot = today.getHours()*100 + Math.ceil(today.getMinutes()/10)*10;
        }

        return result;
    }, {});
};


exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        // var DATE = event.pathParameters.date;
        // var SLOT = event.pathParameters.slot;
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

        console.log("user verification");

        var exist2;
        var total_time = 0;

        for(var i=0;i<service.length;i++) {
            
            exist2 = await serviceVerifier(service[i].serviceId);

            if(exist2.success == false) {
                break;
            }

            total_time += Number(exist2.service.time);
        }

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Services not found',
                })
            }
        }

        total_time += 10;

        var today = new Date();
        today.setHours(today.getHours() + 5);
        today.setMinutes(today.getMinutes() + 30);
        var now = new Date();
        now.setHours(now.getHours() + 5);
        now.setMinutes(now.getMinutes() + 30);
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        var day = dd + '-' + mm + '-' + yyyy;

        if(today.getHours()>=19) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'The service time is over'
                })
            }
        } else if(today.getHours()<9) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'The service time has not started'
                })
            }
        }

        console.log(day);

        var params = {
            TableName: 'BarbersLog',
            KeyConditionExpression: '#date = :d',
            ExpressionAttributeValues: {
                ':d': day,
            },
            ExpressionAttributeNames: {
                '#date': 'date',
            }
        }

        try {
            var data = await documentClient.query(params).promise();

            console.log(data.Items);

            var groupedBarbers = groupBy(data.Items, total_time);

            console.log(groupedBarbers);

            var long1 = exist1.user.longitude;
            var lat1 = exist1.user.latitude;
            var data1;
            var barbers = [];

            var slot = now.getHours()*100 + Math.ceil(now.getMinutes()/10)*10;
            var dist;
            var diff;
            var diffhr;
            var diffmin; 

            if(slot <= 1000) {
                total_time -= 10;
                now = new Date(now.getFullYear(), now.getMonth(), now.getDate(), '09', '60');
                slot = now.getHours()*100;
            }
    
            for( ; slot <= 1850 ; ) {

                console.log("slot:",slot);
                
                if(groupedBarbers[slot]) {

                    for(var i=0 ; i<groupedBarbers[slot].length ; i++) {
                        params = {
                            TableName: 'Users',
                            Key: {
                                id: groupedBarbers[slot][i].barberId,
                            },
                            ProjectionExpression: 'id, longitude, latitude, coins'
                        }
        
                        data1 = await documentClient.get(params).promise();
                        dist = await getDistance(lat1,long1,data1.Item.latitude,data1.Item.longitude);
                        diff =(now - today);
                        diffhr = Math.floor((diff % 86400000) / 3600000);
                        diffmin = Math.round(((diff % 86400000) % 3600000) / 60000);
                        console.log(diff);
                        console.log(diffhr);
                        console.log(diffmin);
                        data1.Item.distance = dist;
                        data1.Item.time = Math.ceil((dist*3)/2 + diffhr*60 + diffmin);
                        data1.Item.slot = String(slot);
    
                        console.log(data1.Item);
        
                        if(data1.Item.coins >= 300 && data1.Item.distance<=10) {
                            barbers.push(data1.Item);
                        } 
                    }     
                }         
    
                now.setMinutes(now.getMinutes() + 10);
                slot = now.getHours()*100 + Math.ceil(now.getMinutes()/10)*10;
            }

            console.log(barbers);

            
            if(barbers.length==0) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: false,
                        message: 'No barbers found'
                    })
                }
            } else {
                barbers.sort((a, b) => {
                    if(a.time>b.time) {
                        return 1;
                    }else if(a.time<b.time) {
                        return -1;
                    }else {
                        return 0;
                    }
                });
    
                console.log(barbers);
    
                var barberId = barbers[0].id;
                var cnt = 0;

                for(var i = Number(barbers[0].slot) ;  ; i += 10) {

                    cnt++;
                   
                    params = {
                        TableName: 'BarbersLog',
                        Key: {
                            date: day,
                            barberId: barberId
                        },
                        UpdateExpression: "set #slot=:s",
                        ExpressionAttributeNames: {
                            '#slot': String(i), 
                        },
                        ExpressionAttributeValues:{
                            ":s": 'p',
                        },
                        ReturnValues:"UPDATED_NEW"
                    }

                    data = await documentClient.update(params).promise();

                    if(i % 100 === 50) {
                        i += 40;
                    }

                    if( cnt > Math.ceil(total_time/10) ) {
                        break;
                    }

                }
    
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'Found a barber',
                        time: barbers[0].time,
                        barberId: barberId,
                        slot: barbers[0].slot
                    })
                }
            }

            // params = {
            //     TableName: 'BarbersLog',
            //     Key: {
            //         date: DATE,
            //         barberId: barberId
            //     }
            // };
    
            // try {
            //     data = await documentClient.get(params).promise();
    
            //     if(data.Item[SLOT] === false) {
            //         var now = new Date();
            //         now.setHours(now.getHours() + 5);
            //         now.setMinutes(now.getMinutes() + 30);
            //         var timestamp = now.getTime(); 
    
            //         for(var i=0;i<service.length;i++){
    
            //             params = {
            //                 TableName: 'Bookings',
            //                 Item: {
            //                     userId: exist1.user.id,
            //                     serviceId: service[i].serviceId + ',' + timestamp,
            //                     barberId: barberId,
            //                     Timestamp: timestamp,
            //                     user_long: exist1.user.longitude,
            //                     user_lat: exist1.user.latitude,
            //                     user_add: exist1.user.address,
            //                     amount: prices[i],
            //                     payment_status: 'pending',
            //                     date: DATE,
            //                     slot: SLOT,
            //                     quantity: service[i].quantity
            //                 }
            //             };
    
            //             data = await documentClient.put(params).promise();
    
            //             total_price += Number(prices[i]);
            //         }
    
            //         var percentage = 0.1;            
    
            //         params = {
            //             TableName: 'Users',
            //             Key: {
            //                 id: barberId,
            //             },
            //             UpdateExpression: "set #coins=#coins - :c",
            //             ExpressionAttributeNames: {
            //                 '#coins': 'coins', 
            //             },
            //             ExpressionAttributeValues:{
            //                 ":c": percentage*exist3.user.coins,
            //             },
            //             ReturnValues:"UPDATED_NEW"
            //         }
    
            //         try {
            //             data = await documentClient.update(params).promise();
    
            //             params = {
            //                 TableName: 'BarbersLog',
            //                 Key: {
            //                     date: DATE,
            //                     barberId: barberId,
            //                 },
            //                 UpdateExpression: "set #slot=:s",
            //                 ExpressionAttributeNames: {
            //                     '#slot': SLOT, 
            //                 },
            //                 ExpressionAttributeValues:{
            //                     ":s": true,
            //                 },
            //                 ReturnValues:"UPDATED_NEW"
            //             }
                
            //             try {
            //                 data = await documentClient.update(params).promise();
                
            //                 return {
            //                     statusCode: 200,
            //                     body: JSON.stringify({
            //                         success: true,
            //                         message: 'Booking successful',
            //                     })
            //                 }
            //             } catch(err) {
            //                 console.log("Error: ", err);
            //                 return {
            //                     statusCode: 500,
            //                     body: JSON.stringify({
            //                         success: false,
            //                         message: err,
            //                     })
            //                 };
            //             }
            //         } catch(err) {
            //             console.log("Error: ", err);
            //             return {
            //                 statusCode: 500,
            //                 body: JSON.stringify({
            //                     success: false,
            //                     message: err,
            //                 })
            //             };
            //         }
            //     }else {
            //         return {
            //             statusCode: 400,
            //             body: JSON.stringify({
            //                 success: false,
            //                 message: 'Booking unsuccessful',
            //             })
            //         };
            //     }
            // }catch(err) {
            //     console.log("Error: ", err);
            //     return {
            //         statusCode: 400,
            //         body: JSON.stringify({
            //             success: false,
            //             message: 'Booking unsuccessful',
            //         })
            //     };
            // }
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