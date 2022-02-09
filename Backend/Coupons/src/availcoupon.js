require('dotenv').config();

var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var CNAME = obj.couponName;
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
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist1.user.role != 'user') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Not a user',
                })
            }
        }

        var params = {
            TableName: 'Stock',
            Key: {
                type: "Ref",
                name: 'ref'
            }
        }

        var data = await documentClient.get(params).promise();

        var serviceId;
        var discount;
        var type;

        if(CNAME === data.Item.couponName) {

            if(exist1.user.invites > 0) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'Coupon successful',
                        discount: data.Item.discount,
                        serviceId: 'all'
                    })
                }
            } else {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        success: false,
                        message: 'No available refer and earn invites left',
                    })
                }
            }
            
        } else {

            params = {
                TableName: 'Coupons',
                KeyConditionExpression: '#name = :n',
                ExpressionAttributeValues: {
                    ':n': CNAME,
                },
                ExpressionAttributeNames: {
                    '#name': 'name'
                }
            }
    
            try {
                data = await documentClient.query(params).promise();

                if(data.Items.length === 0) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Coupon does not exist'
                        })
                    };
                } else {

                    if(data.Items[0].used_by.includes(userID.id)) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({
                                success: false,
                                message: 'Coupon already used'
                            })
                        };
                    } 

                    type = 'coupon';
                    serviceId = data.Items[0].serviceId;
                    discount = data.Items[0].discount;

                    var flag = false;
                    var total_price = 0;
                    var disc_amount = 0;

                    for(var i=0;i<service.length;i++) {
                        
                        exist2 = await serviceVerifier(service[i].serviceId);

                        if(exist2.success == false) {
                            break;
                        }

                        if(serviceId.includes(service[i].serviceId)) {
                            // if(data.Items[0].upper_price_limit !== -1) {
                            //     if(Number(exist2.service.price) <= data.Items[0].upper_price_limit) {
                            //         total_price += service[i].quantity*Number(exist2.service.price);
                            //         flag = true;
                            //     } else {
                            //         return {
                            //             statusCode: 400,
                            //             body: JSON.stringify({
                            //                 success: false,
                            //                 message: 'Coupon upper limit is lower',
                            //             })
                            //         }
                            //     }
                            // } else {
                            total_price += service[i].quantity*Number(exist2.service.price);
                            disc_amount += service[i].quantity*Number(exist2.service.price);
                            flag = true;
                            // }
                        } else {
                            total_price += service[i].quantity*Number(exist2.service.price);
                        }
                    
                    }

                    if(serviceId === 'all') {
            
                        if(total_price < data.Items[0].lower_price_limit) {
                            return {
                                statusCode: 400,
                                body: JSON.stringify({
                                    success: false,
                                    message: 'Wrong prices sent',
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
                        
                    }else{
                        if(disc_amount < data.Items[0].lower_price_limit) {
                            return {
                                statusCode: 400,
                                body: JSON.stringify({
                                    success: false,
                                    message: 'Coupon lower limit is higher',
                                })
                            }
                        }
                    }

                    if(!flag) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({
                                success: false,
                                message: 'Coupon cannot be applied',
                            })
                        }
                    }

                    
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            success: true,
                            message: 'Coupon successful',
                            upper_price_limit: data.Items[0].upper_price_limit,
                            lower_price_limit: data.Items[0].lower_price_limit,
                            data: data.Items[0].discount,
                            serviceId: data.Items[0].serviceId 
                        })
                    }
                    
                
                }
    
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

    } catch(err) {
        console.log(err);
        return err;
    }
}