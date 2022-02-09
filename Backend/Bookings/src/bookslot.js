require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var https = require('https');
const { google } = require("googleapis");
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, serviceVerifier, offerVerifier } = require("./authentication");
const { getDistance } = require('./helper');

const auth = new google.auth.GoogleAuth({
    keyFile: "keys.json", //the key file
    //url to spreadsheets API
    scopes: "https://www.googleapis.com/auth/spreadsheets", 
});


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
        var exist3;
        var prices = [];
        var total_price = 0;
        var total_time = 0;
        var params = {
            TableName: 'Stock',
            Key: {
                type:'Ref',
                name: 'ref'
            }
        };

        var data = await documentClient.get(params).promise();

        var serviceId;
        var discount;
        var uplim;
        var type;
        var refcoupon = data.Item.couponName

        console.log("coupon");

        if(obj.couponName){
            if(obj.couponName === refcoupon) {

                if(exist1.user.invites > 0) {
                    type = 'ref';
                    serviceId = 'all';
                    discount = data.Item.discount;
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
                    uplim = data.Items[0].upper_price_limit;
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

        console.log("done");

        var flag = false;
        var flag1 = true;
        var gender = 'male';
        var serviceName = [];
        var off;
        var p = 0;
        var d;
        var disc_amount = 0;

        var today = new Date();
        today.setHours(today.getHours() + 5);
        today.setMinutes(today.getMinutes() + 30);

        for(var i=0;i<service.length;i++) {
            
            exist2 = await serviceVerifier(service[i].serviceId);

            if(exist2.success == false) {
                break;
            }

            if(exist2.service.category.startsWith("Women")) {
                gender = 'female';
            }

            off = false;

            if(service[i].offerName) {
                if(service[i].offerName !== ""){
                    exist3 = await offerVerifier(service[i].serviceId, service[i].offerName);
    
                    console.log(exist3);
    
                    if(exist3.success === false){
                        flag1 = false;
                        break;
                    }
    
                    if(exist3.offer.user_limit - service[i].quantity <= 0){
                        flag1 = false;
                        break;
                    }
    
                    var Day = today.getDay();
    
                    if(Day === 0) Day = 7;
    
                    console.log(Day);
    
                    if(Day < exist3.offer.start){
                        flag1 = false;
                        break;
                    }
    
                    if(Day > exist3.offer.end){
                        flag1 = false;
                        break;
                    }
                    
                    off = true;
                }

            }

            if(obj.couponName) {
                if(serviceId.includes(service[i].serviceId)) {
                    if(service[i].offerName === "" || !off) {
                        prices.push(service[i].quantity*Number(exist2.service.price));
                        total_price += service[i].quantity*Number(exist2.service.price);
                    } else {
                        prices.push(service[i].quantity*(Number(exist2.service.price)-Math.floor((exist3.offer.discount*Number(exist2.service.price))/100)));
                        total_price += service[i].quantity*(Number(exist2.service.price)-Math.floor((exist3.offer.discount*Number(exist2.service.price))/100));
                    }
                    flag = true;
                    d = service[i].quantity*Number(exist2.service.price);
                    disc_amount += d;
                    p += Math.floor((discount*d)/100);
                } else {
                    if(service[i].offerName === "" || !off) {
                        prices.push(service[i].quantity*Number(exist2.service.price));
                        total_price += service[i].quantity*Number(exist2.service.price);
                    } else {
                        prices.push(service[i].quantity*(Number(exist2.service.price)-Math.floor((exist3.offer.discount*Number(exist2.service.price))/100)));
                        total_price += service[i].quantity*(Number(exist2.service.price)-Math.floor((exist3.offer.discount*Number(exist2.service.price))/100));
                    }
                }
            } else {
                if(service[i].offerName === "" || !off) {
                    prices.push(service[i].quantity*Number(exist2.service.price));
                    total_price += service[i].quantity*Number(exist2.service.price);
                } else {
                    prices.push(service[i].quantity*(Number(exist2.service.price)-Math.floor((exist3.offer.discount*Number(exist2.service.price))/100)));
                    total_price += service[i].quantity*(Number(exist2.service.price)-Math.floor((exist3.offer.discount*Number(exist2.service.price))/100));
                }
            }
        
            total_time += service[i].quantity*Number(exist2.service.time);
            serviceName.push(exist2.service.name + ' (' + exist2.service.category + ')');
        }

        if(!flag1) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Offer not available',
                })
            }
        }

        var coupon;

        if(obj.couponName) {
            if(serviceId === 'all') {
                d = total_price;
                if(type === 'ref') {
                    p += Math.floor((discount*d)/100);
                    if(total_price - p !== obj.totalprice) {
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
                    p += Math.floor((discount*d)/100);
                    if(total_price - Math.min(p,uplim) !== obj.totalprice) {
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
                                message: 'Coupon lower limit is higher',
                            })
                        }
                    }
    
                    // if(data.Items[0].upper_price_limit !== -1) {
                    //     if(total_price > data.Items[0].upper_price_limit) {
                    //         return {
                    //             statusCode: 400,
                    //             body: JSON.stringify({
                    //                 success: false,
                    //                 message: 'Wrong prices sent',
                    //             })
                    //         }
                    //     }
                    // }
    
                    flag = true;
                }
            }else if(disc_amount < data.Items[0].lower_price_limit){
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'Coupon lower limit is higher',
                    })
                }
            }
    
            coupon = data.Items[0];
        }

        if(obj.couponName) {
            if(!flag) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'Wrong prices sent',
                    })
                }
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

        if(obj.couponName) {
            if(type === 'ref'){
                total_price -= p;
            }else {
                total_price -= Math.min(uplim,p);
            }
        }

        if(total_price !== obj.totalprice) {
            console.log(obj.totalprice);
            console.log("cal",total_price);
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Wrong total price sent'
                })
            }
        } 

        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();
        var day = dd + '-' + mm + '-' + yyyy;

        var now = new Date();
        now.setHours(now.getHours() + 5);
        now.setMinutes(now.getMinutes() + 30);

        console.log(Number(SLOT));
        console.log(Number(today.getHours()));

        var date1 = DATE.split('-');

        var date = new Date(Number(date1[2]),Number(date1[1])-1,Number(date1[0]));

        console.log(Number(date.getTime()));
        console.log(Number(today.getTime()));

        var slot = Number(SLOT);

        // if(slot%100 === 90) {
        //     slot = ((slot/100))*100 + 50;
        // }

        // if(slot === 950) {
        //     slot = 1000;
        //     SLOT = String(slot);
        // } else {
        //     SLOT = String(slot);
        //     total_time += 10;
        // }

        console.log("slot",slot);
        console.log("SLOT",SLOT);

        if(date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
            if(slot <= Number(today.getHours())) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'Slot chosen is not possible'
                    })
                };
            } 
        } else if(date.getTime()<=today.getTime()) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Date chosen is not possible'
                })
            };
        }

        var distance;

        params = {
            TableName: 'Stock',
            Key: {
                type: 'Distance',
                name: 'distance'
            }
        }

        data = await documentClient.get(params).promise();

        distance = data.Item.distance;

        params = {
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
            var data1 = await documentClient.query(params).promise();

            console.log(data1.Items);

            // var slot = Number(SLOT) - 10;

            // if(slot%100 === 0) {
            //     if(slot === 950) {
            //         slot += 10;
            //     } else {
            //         slot = (slot/100)*100 + 60;
            //     }
            // }

            var cnt = 0;

            for(var i = slot ; ; i++) {

                cnt+=60;

                data1.Items = data1.Items.filter((barber) => {
                    return barber[String(i)] === 'n';
                });

                if(cnt >= total_time) {
                    break;
                }
                
            }

            console.log(data1.Items);

            var data2;
            var barbers = [];
            var long1 = exist1.user.longitude;
            var lat1 = exist1.user.latitude;

            console.log(distance);

            for(var i=0;i<data1.Items.length;i++){
                params = {
                    TableName: 'Users',
                    Key: {
                        id: data1.Items[i].barberId,
                    }
                }

                data2 = await documentClient.get(params).promise();
                data2.Item.distance = await getDistance(lat1,long1,data2.Item.latitude,data2.Item.longitude);

                console.log("inside",data2.Item);

                if(data2.Item.coins >= 300 && data2.Item.distance<=distance && data2.Item.gender === gender && data2.Item.status=='active') {
                    console.log(data2.Item);
                    barbers.push(data2.Item);
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
                var phone = barbers[0].phone;
                var name = barbers[0].name;

                params = {
                    TableName: 'BarbersLog',
                    Key: {
                        date: DATE,
                        barberId: barberId
                    }
                };
        
                try {
                    data1 = await documentClient.get(params).promise();

                    console.log(data1.Item);
        
                    var timestamp = now.getTime(); 
                    
                    console.log(total_price);

                    cnt = 0;

                    for(var i = slot ; ; i++) {

                        cnt+=60;

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
            
                        data1 = await documentClient.update(params).promise();

                        if(cnt > total_time) {
                            break;
                        }
                        
                    }

                     //Auth client Object
                    const authClientObject = await auth.getClient();

                    const googleSheetsInstance = google.sheets({ version: "v4", auth: authClientObject });

                    const spreadsheetId = "1NOsQ1OS-oRa0BW0-G9cUSUBGRd0hJRy_FnNZFeMZB_8";

                    var arr;

                    for(var i=0;i<service.length;i++){

                        off = false;

                        if(service[i].offerName) {
                            if(service[i].offerName !== ""){
                                off = true;
                            }
                        }

                        params = {
                            TableName: 'Bookings',
                            Item: {
                                userId: exist1.user.id,
                                serviceId: service[i].serviceId + ',' + String(timestamp) + (off ? "," + service[i].offerName : ""),
                                barberId: barberId,
                                Timestamp: timestamp,
                                user_long: exist1.user.longitude,
                                user_lat: exist1.user.latitude,
                                user_add: exist1.user.address,
                                amount: prices[i],
                                total_price: total_price,
                                payment_status: 'pending',
                                service_status: 'pending',
                                date: DATE,
                                slot: SLOT,
                                quantity: service[i].quantity,
                                offer: off
                            }
                        };

                        console.log(params);

                        data1 = await documentClient.put(params).promise();

                        if(off) {
                            params = {
                                TableName: 'Offers',
                                Key: {
                                    serviceId: service[i].serviceId,
                                    name: service[i].offerName
                                },
                                UpdateExpression: "set #user_limit=#user_limit - :u",
                                ExpressionAttributeNames: {
                                    '#user_limit': 'user_limit', 
                                },
                                ExpressionAttributeValues:{
                                    ":u": 1,
                                },
                                ReturnValues:"UPDATED_NEW"
                            }
        
                            
                            data1 = await documentClient.update(params).promise();
                        }

                        arr = [];

                        if(i==0) {
                            if(!exist1.user.name) {
                                arr.push('');
                            } else {
                                arr.push(exist1.user.name);
                            }
    
                            arr.push(exist1.user.phone);
    
                            arr.push(exist1.user.address);
    
                            arr.push(day);
    
                            arr.push(DATE);

                            arr.push(SLOT);
    
                            if(!name) {
                                arr.push('');
                            } else {
                                arr.push(name);
                            }
    
                            arr.push(phone);
    
                            arr.push(serviceName[i] + (off ? "(" + service[i].offerName + ") (Offer)" : ""));

                            arr.push(total_price);
                        } else {
                            arr.push('');
    
                            arr.push('');
    
                            arr.push('');
    
                            arr.push('');

                            arr.push('');
    
                            arr.push('');
    
                            arr.push('')
    
                            arr.push('');
    
                            arr.push(serviceName[i] + (off ? "(" + service[i].offerName + ") (Offer)" : ""));

                            arr.push(total_price);
                        }

                        await googleSheetsInstance.spreadsheets.values.append({
                            auth, //auth object
                            spreadsheetId, //spreadsheet id
                            range: "Sheet1!A:B", //sheet name and range of cells
                            valueInputOption: "USER_ENTERED", // The information will be passed according to what the user passes in as date, number or text
                            insertDataOption: 'INSERT_ROWS',
                            resource: {
                                values: [ arr ],
                            },
                        });
                    }

                    if(obj.couponName) {
                        if(obj.couponName === refcoupon) {
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

                            var usedby = coupon.used_by.split(",").length - 1;

                            console.log(usedby);

                            if(coupon.user_limit === -1) {
                                params = {
                                    TableName: 'Coupons',
                                    Key: {
                                        name: obj.couponName,
                                        serviceId: coupon.serviceId
                                    },
                                    UpdateExpression: "set #used_by=:u",
                                    ExpressionAttributeNames: {
                                        '#used_by': 'used_by', 
                                    },
                                    ExpressionAttributeValues:{
                                        ":u": coupon.used_by + ',' + userID.id,
                                    },
                                    ReturnValues:"UPDATED_NEW"
                                }
            
                                
                                data1 = await documentClient.update(params).promise();
                            } else {
                                if(usedby + 1 === coupon.user_limit) {

                                    params = {
                                        TableName: 'Coupons',
                                        Key: {
                                            name: obj.couponName,
                                            serviceId: coupon.serviceId
                                        }
                                    }
                                    
                                    data1 = await documentClient.delete(params).promise();

                                } else {
                                    params = {
                                        TableName: 'Coupons',
                                        Key: {
                                            name: obj.couponName,
                                            serviceId: coupon.serviceId
                                        },
                                        UpdateExpression: "set #used_by=:u",
                                        ExpressionAttributeNames: {
                                            '#used_by': 'used_by', 
                                        },
                                        ExpressionAttributeValues:{
                                            ":u": coupon.used_by + ',' + userID.id,
                                        },
                                        ReturnValues:"UPDATED_NEW"
                                    }
                
                                    
                                    data1 = await documentClient.update(params).promise();
                                }
                            }
                            
                        }
                    }         

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
                            ":c": total_price,
                        },
                        ReturnValues:"UPDATED_NEW"
                    }

                    
                    data1 = await documentClient.update(params).promise();

                    // slot = Number(SLOT) - 10;

                    // if(slot%100 === 0) {
                    //     slot = (slot/100)*100 + 60;
                    // }

                    var msg = `You have been booked on ${DATE} at ${(Number(SLOT) > 12 ? String(Number(SLOT) - 12) : SLOT )}${(Number(SLOT) >= 12 ? 'pm' : 'am' )}`

                    var fcmnotif = await new Promise((resolve, reject) => {
                        const options = {
                            host: 'fcm.googleapis.com',
                            path: '/fcm/send',
                            method: 'POST',
                            headers: {
                                'Authorization': 'key=' + process.env.FCM_AUTH,
                                'Content-Type': 'application/json',
                            },
                        };
                    
                        console.log(options);
                        const req = https.request(options, (res) => {
                            console.log('success');
                            console.log(res.statusCode);
                            resolve('success');
                        });
                    
                        req.on('error', (e) => {
                            console.log('failure' + e.message);
                            reject(e.message);
                        });
                    
                        // const reqBody = '{"to":"' + deviceToken + '", "priority" : "high"}';
                        const reqBody = '{"to":"/topics/' + phone + '", "priority": "high", "notification": {"title": "Barbera Home Salon", "body":"' + msg + '", "click_action":"OPEN_BOOKING_ACTIVITY"}}';
                        console.log(reqBody);
                    
                        req.write(reqBody);
                        req.end();
                        
                    });

                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            success: true,
                            message: 'Booking successful',
                            fcmnotif: fcmnotif
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