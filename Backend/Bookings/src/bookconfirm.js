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
        var SLOT = obj.slot;
        var barberId = obj.barberId;
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
                    message: 'Not a barber',
                })
            }
        }

        var exist2;
        var prices = [];
        var total_price = 0;
        var total_time = 0;
        var data;
        var params;
        var serviceId;
        var discount;
        var type;

        if(obj.couponName){
            if(obj.couponName === 'BARBERAREF') {

                if(exist1.user.invites > 0) {
                    type = 'ref';
                    serviceId = 'all';
                    discount = 100;
                } else {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Wrong Coupon Entered'
                        })
                    };
                }

            } else {

                params = {
                    TableName: 'Coupons',
                    KeyConditionExpression: '#name = :n',
                    ExpressionAttributeValues: {
                        ':n': obj.couponName,
                    },
                    ExpressionAttributeNames: {
                        '#name': 'name'
                    }
                }

                try {
                    data = await documentClient.query(params).promise();

                    if(data.Items[0].used_by.includes(userID.id)) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({
                                success: false,
                                message: 'Coupon already used by user'
                            })
                        };
                    }

                    type = 'coupon';
                    serviceId = data.Items[0].serviceId;
                    discount = data.Items[0].discount;
                } catch(err) {
                    return {
                        statusCode: 500,
                        body: JSON.stringify({
                            success: false,
                            message: err
                        })
                    };
                }
            }
        }

        var flag = false;

        for(var i=0;i<service.length;i++) {
            
            exist2 = await serviceVerifier(service[i].serviceId);

            if(exist2.success == false) {
                break;
            }

            if(service[i].serviceId === serviceId) {
                if(exist2.service.price >= data.Items[0].lower_price_limit) {
                    if(data.Items[0].upper_price_limit !== -1) {
                        if(exist2.service.price <= data.Items[0].upper_price_limit) {
                            prices.push(service[i].quantity*exist2.service.price);
                            total_price += service[i].quantity*exist2.service.price;
                            flag = true;
                        } 
                    } else {
                        prices.push(service[i].quantity*exist2.service.price);
                        total_price += service[i].quantity*exist2.service.price;
                        flag = true;
                    }
                } 
            } else {
                prices.push(service[i].quantity*exist2.service.price);
                total_price += service[i].quantity*exist2.service.price;
                flag = true;
            }

            total_time += service[i].quantity*Number(exist2.service.time);
        }

        if(serviceId === 'all') {
            if(type === 'ref') {
                if(total_price - discount !== obj.totalprice) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Wrong prices sent',
                        })
                    }
                } 
                
                flag = true;
                
            } else {
                if(total_price - discount !== obj.totalprice) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Wrong prices sent',
                        })
                    }
                }
    
                if(total_price < data.Items[0].lower_price_limit) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Wrong prices sent',
                        })
                    }
                }

                if(data.Items[0].upper_price_limit !== -1) {
                    if(total_price > data.Items[0].upper_price_limit) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({
                                success: false,
                                message: 'Wrong prices sent',
                            })
                        }
                    }
                }

                flag = true;
            }
        }

        if(!flag) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Wrong prices sent',
                })
            }
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
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        var day = dd + '-' + mm + '-' + yyyy;

        // if(Number(today.getHours())>=19) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'The service time is over'
        //         })
        //     }
        // } else if(Number(today.getHours())<9) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'The service time has not started'
        //         })
        //     }
        // }

        console.log(day);

        params = {
            TableName: 'BarbersLog',
            Key: {
                date: day,
                barberId: barberId
            }
        }

        try {
            var data1 = await documentClient.get(params).promise();
            var flag = true;

            console.log(data1.Item);

            var cnt = 0;

            for(var i = Number(SLOT) ;  ; i++) {
                cnt+=60;

                if( data1.Item[String(i)] !== 'p') {
                    flag = false;
                    break;
                }

                if( cnt >= total_time ) {
                    break;
                }
    
            }

            if(flag) {
                cnt = 0;
                var timestamp = today.getTime();

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
                            total_price: total_price,
                            payment_status: 'pending',
                            service_status: 'pending',
                            date: day,
                            slot: SLOT,
                            quantity: service[i].quantity
                        }
                    };

                    data1 = await documentClient.put(params).promise();

                }

                if(obj.couponName) {
                    if(obj.couponName === 'BARBERAREF') {
                        params = {
                            TableName: 'Users',
                            Key: {
                                id: userID.id,
                            },
                            UpdateExpression: "set #invites=#invites - :i",
                            ExpressionAttributeNames: {
                                '#invites': 'invites', 
                            },
                            ExpressionAttributeValues:{
                                ":i": 1,
                            },
                            ReturnValues:"UPDATED_NEW"
                        }
    
                        
                        data1 = await documentClient.update(params).promise();
                    } else {

                        var usedby = data.Items[0].used_by.split(",").length - 1;

                        console.log(usedby);

                        if(data.Items[0].user_limit === -1) {
                            params = {
                                TableName: 'Coupons',
                                Key: {
                                    name: obj.couponName,
                                    serviceId: data.Items[0].serviceId
                                },
                                UpdateExpression: "set #used_by=:u",
                                ExpressionAttributeNames: {
                                    '#used_by': 'used_by', 
                                },
                                ExpressionAttributeValues:{
                                    ":u": data.Items[0].used_by + ',' + userID.id,
                                },
                                ReturnValues:"UPDATED_NEW"
                            }
        
                            
                            data1 = await documentClient.update(params).promise();
                        } else {
                            if(usedby + 1 === data.Items[0].user_limit) {

                                params = {
                                    TableName: 'Coupons',
                                    Key: {
                                        name: obj.couponName,
                                        serviceId: data.Items[0].serviceId
                                    }
                                }
                                
                                data1 = await documentClient.delete(params).promise();

                            } else {
                                params = {
                                    TableName: 'Coupons',
                                    Key: {
                                        name: obj.couponName,
                                        serviceId: data.Items[0].serviceId
                                    },
                                    UpdateExpression: "set #used_by=:u",
                                    ExpressionAttributeNames: {
                                        '#used_by': 'used_by', 
                                    },
                                    ExpressionAttributeValues:{
                                        ":u": data.Items[0].used_by + ',' + userID.id,
                                    },
                                    ReturnValues:"UPDATED_NEW"
                                }
            
                                
                                data1 = await documentClient.update(params).promise();
                            }
                        }
                        
                    }
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
                        ":c": percentage*exist3.user.coins,
                    },
                    ReturnValues:"UPDATED_NEW"
                }
    
                data1 = await documentClient.update(params).promise();

                for(var i = Number(SLOT) ;  ; i++ ) {
                    console.log(i);
        
                    cnt+=60;
                   
                    params = {
                        TableName: 'BarbersLog',
                        Key: {
                            date: day,
                            barberId: barberId
                        },
                        UpdateExpression: "set #slot=:s",
                        ExpressionAttributeNames: {
                            '#slot': i, 
                        },
                        ExpressionAttributeValues:{
                            ":s": 'b',
                        },
                        ReturnValues:"UPDATED_NEW"
                    }
        
                    data1 = await documentClient.update(params).promise();
        
                    if( cnt >= total_time) {
                        break;
                    }
        
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'Booking successful'
                    })
                }
            } else {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        success: false,
                        message: 'Invalid slot found'
                    })
                }
            }

            
        } catch(err) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid barber ID'
                })
            }
        }
        

    } catch(err) {
        console.log(err);
        return err;
    }
}