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
        var NAME = obj.name;
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

        if(NAME === 'BARBERAREF') {

            if(exist1.user.invites > 0) {
                var params = {
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
        
                try {
                    var data = await documentClient.update(params).promise();
        
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            success: true,
                            message: 'Coupon successful',
                        })
                    }
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

            var params = {
                TableName: 'Coupons',
                Key: {
                    name: NAME,
                    serviceId: serviceId
                }
            }
    
            try {
                var data = await documentClient.get(params).promise();

                if(!data.Item) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            success: false,
                            message: 'Coupon does not exist'
                        })
                    };
                } else {

                    if(data.Item.used_by.includes(userID.id)) {
                        return {
                            statusCode: 200,
                            body: JSON.stringify({
                                success: false,
                                message: 'Coupon already used'
                            })
                        };
                    } else {
                        params = {
                            TableName: 'Coupons',
                            Key: {
                                name: NAME,
                                serviceId: serviceId
                            },
                            UpdateExpression: "set #used_by=:u",
                            ExpressionAttributeNames: {
                                '#used_by': 'used_by', 
                            },
                            ExpressionAttributeValues:{
                                ":u": data.Item.used_by + userID.id + ',',
                            },
                            ReturnValues:"UPDATED_NEW"
                        }
    
                        try {
                            var data1 = await documentClient.update(params).promise();
                            return {
                                statusCode: 200,
                                body: JSON.stringify({
                                    success: true,
                                    message: 'Coupon successful',
                                    data: data.Item.discount 
                                })
                            }
                        } catch(err) {
                            return {
                                statusCode: 500,
                                body: JSON.stringify({
                                    success: false,
                                    message: 'Coupon unsuccessful'
                                })
                            }
                        }
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