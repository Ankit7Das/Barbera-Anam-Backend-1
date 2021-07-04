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

        var serviceId = event.pathParameters.serviceid;
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

        if(exist3 == true) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: false,
                    message: 'Already added to cart',
                })
            }
        }

        var NAME = exist2.data.name;
        var PRICE = exist2.data.price;
        
        var params = {
            TableName: 'Carts',
            Item: {
                userId: userID.id,
                serviceId: serviceId,
                name: NAME,
                price: PRICE,
                quantity: 1
            }
        };

        var data;
        var msg;

        try {
            data = await documentClient.put(params).promise();
            console.log("Item entered successfully:", data);
            msg = 'Added to Cart';

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: msg,
                })
            };
        } catch(err) {
            console.log("Error: ", err);
            msg = err;

            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: msg,
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

exports.quantity = async (event) => {
    try {

        var serviceId = event.pathParameters.serviceid;
        var token = event.headers.token;
        var obj = JSON.parse(event.body);
        var FLOW = obj.flow;

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

        var params;

        if(FLOW == true) {
            params = {
                TableName: 'Carts',
                Key: {
                    userId: userID.id,
                    serviceId: serviceId,
                },
                UpdateExpression: "set #quantity=#quantity + :q",
                ExpressionAttributeNames: {
                    '#quantity': 'quantity'
                },
                ExpressionAttributeValues:{
                    ":q": 1,
                },
                ReturnValues:"UPDATED_NEW"
            };
        } else {
            params = {
                TableName: 'Carts',
                Key: {
                    userId: userID.id,
                    serviceId: serviceId,
                },
                UpdateExpression: "set #quantity=#quantity - :q",
                ExpressionAttributeNames: {
                    '#quantity': 'quantity'
                },
                ExpressionAttributeValues:{
                    ":q": 1,
                },
                ReturnValues:"UPDATED_NEW"
            };
        } 

        var data;
        var msg;

        try {
            data = await documentClient.update(params).promise();
            msg = 'Service quantity updated';

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: msg,
                })
            };
        } catch(err) {
            console.log("Error: ", err);
            msg = err;
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: msg,
                })
            };
        }

        

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.deletefromcart = async (event) => {
    try {

        var serviceId = event.pathParameters.serviceid;
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
        var msg;

        try {
            data = await documentClient.delete(params).promise();
            msg = 'Item deleted from Cart';

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: msg,
                })
            };
        } catch(err) {
            console.log("Error: ", err);
            msg = err;
            return {
                statusCode: 500,
                body: JSON.stringify({
                    success: false,
                    message: msg,
                })
            };
        }

        

    } catch(err) {
        console.log(err);
        return err;
    }
}