require('dotenv').config();

var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");


exports.addtocart = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var serviceId = obj.serviceid;
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
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'User does not have role as user',
                })
            }
        }

        var exist2;
        var exist3;
        var NAME;
        var PRICE;
        var TIME;
        var params;
        var data;
        var cnt = 0;
        var cnt1 = 0;

        for(var i=0;i<serviceId.length;i++) {
            exist2 = await serviceVerifier(serviceId[i]);

            if(exist2.success == false) {
                cnt1++;
                continue;
            }
            
            exist3 = await addedBefore(userID.id, serviceId[i]);

            if(exist3 == true) {
                cnt++;
                continue;
            }

            NAME = exist2.data.name;
            PRICE = exist2.data.price;
            TIME = exist2.data.time;
            
            params = {
                TableName: 'Carts',
                Item: {
                    userId: userID.id,
                    serviceId: serviceId[i],
                    name: NAME,
                    price: PRICE,
                    quantity: 1,
                    time: TIME
                }
            };

            data = await documentClient.put(params).promise();
        }
 
        if(cnt + cnt1 < serviceId.length) {
            params = {
                TableName: 'Carts',
                KeyConditionExpression: '#user = :u',
                ExpressionAttributeValues: {
                    ':u': userID.id,
                },
                ExpressionAttributeNames: {
                    '#user': 'userId'
                }
            };
    
            data = await documentClient.query(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Added to Cart',
                    count: data.Count
                })
            };
        } else if(cnt == serviceId.length) {
            return {
                statusCode: 500,
                body:JSON.stringify({
                    success: false,
                    message: 'Already added in cart'
                })
            };
        }else {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: 'Service IDs are invalid',
                })
            };
        }


    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.getcart = async (event) => {
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

        if(exist1.user.role != 'user') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'User does not have role as user',
                })
            }
        }

        var params = {
            TableName: 'Carts',
            KeyConditionExpression: '#user = :u',
            ExpressionAttributeValues: {
                ':u': userID.id,
            },
            ExpressionAttributeNames: {
                '#user': 'userId'
            }
        };

        try {
            var data = await documentClient.query(params).promise();

            // var cart = [];
            // for(var i=0;i<data.Items.length;i++) {
            //     params = {
            //         TableName: 'Services',
            //         Key: {
            //             id: id,
            //         }
            //     }
            
            //     data = await documentClient.get(params).promise();
            
            //     if(!data.Item) {
            //         cart.push(data.Item);
            //     } else {
            //         return {
            //             statusCode: 400,
            //             body: JSON.stringify({
            //                 success: false,
            //                 message: 'Service Ids provided are wrong',
            //             })
            //         };
            //     }
            // }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Cart Items found',
                    data: data.Items,
                    count: data.Count
                })
            };
        } catch(err) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    message: 'No items in cart'
                })
            };
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.quantityupdate = async (event) => {
    try {

        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];
        var obj = JSON.parse(event.body);
        var service = obj.service;

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
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'User does not have role as user',
                })
            }
        }

        var exist2;
        var exist3;
        var params;
        var data;
        var cnt = 0;
        var cnt1 = 0;

        for(var i=0;i<service.length;i++) {
            exist2 = await serviceVerifier(service[i].id);

            if(exist2.success == false) {
                cnt1++;
                continue;
            }
            
            exist3 = await addedBefore(userID.id, service[i].id);

            if(exist3 == false) {
                cnt++;
                continue;
            }

            params = {
                    TableName: 'Carts',
                    Key: {
                        userId: userID.id,
                        serviceId: service[i].id,
                    },
                    UpdateExpression: "set #quantity=:q",
                    ExpressionAttributeNames: {
                        '#quantity': 'quantity'
                    },
                    ExpressionAttributeValues:{
                        ":q": service[i].quantity,
                    },
                    ReturnValues:"UPDATED_NEW"
            };

            data = await documentClient.update(params).promise();
        }

        var msg;

        if(cnt + cnt1 < service.length) {
            
            msg = 'Service quantity updated';

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: msg,
                })
            };
        } else if(cnt == serviceId.length) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Services IDs invalid',
                })
            }
        }else {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Services not in cart',
                })
            }
        }

        

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.deletefromcart = async (event) => {
    try {

        var serviceId = event.pathParameters.serviceid;
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
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'User does not have role as user',
                })
            }
        }

        var exist2 = await serviceVerifier(serviceId);

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Service Unavailable',
                })
            }
        }
        
        var exist3 = await addedBefore(userID.id, serviceId);

        if(exist3 == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Service not in cart',
                })
            }
        }

        var params = {
            TableName: 'Carts',
            Key:{
                userId: userID.id,
                serviceId: serviceId
            }
        }

        var data;

        try {
            data = await documentClient.delete(params).promise();

            params = {
                TableName: 'Carts',
                KeyConditionExpression: '#user = :u',
                ExpressionAttributeValues: {
                    ':u': userID.id,
                },
                ExpressionAttributeNames: {
                    '#user': 'userId'
                }
            };
    
            
            data = await documentClient.query(params).promise();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Item deleted from Cart',
                    count: data.Count
                })
            };
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