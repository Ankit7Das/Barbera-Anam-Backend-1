require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
var { Buffer } = require('buffer');
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");
const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});
var fileType = require('file-type');

const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
    
        var ID = obj.id;
        var NAME = obj.name;
        var PRICE = obj.price;
        var TIME = obj.time;
        var DET = obj.details;
        var CUT = obj.cutprice;
        var DOD = obj.dod;
        var CAT = obj.category;
        var TYPE = obj.type;
        var SUBTYPE = obj.subtype;
        var TREND = obj.trending;
        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];

        if(token == null) {
            return {
                statusCode: 401,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
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
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
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
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'User not found',
                })
            }
        }

        if(exist1.user.role != 'admin') {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Not an admin',
                })
            }
        }
        
        var exist2 = await serviceVerifier(ID);

        if(exist2.success == false) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'No such service exists for updating',
                })
            }
        }

        var prevCat = exist2.service.category;
        var prevName = exist2.service.name;
        var prevType = exist2.service.type;

        var params = {
            TableName: 'Services',
            Key: {
                id: ID,
            },
            UpdateExpression: "set #name=:n, #price=:p, #time=:ti, #details=:det, #cut=:c, #deal=:dod, #type=:t, #subtype=:s, #category=:g, #trend=:tr",
            ExpressionAttributeNames: {
                '#name': 'name',
                '#price': 'price',
                '#time': 'time',
                '#details': 'details',
                '#cut': 'cutprice',
                '#deal': 'dod',
                '#type': 'type',
                '#subtype': 'subtype',
                '#category': 'category',
                '#trend': 'trending', 
            },
            ExpressionAttributeValues:{
                ":n": NAME,
                ":p": PRICE,
                ":ti": TIME,
                ":det": DET ? DET : null,
                ":c": CUT ? CUT : null,
                ":dod": DOD ? DOD : false,
                ":t": TYPE,
                ":s": SUBTYPE,
                ":g": CAT,
                ":tr": TREND
            },
            ReturnValues:"UPDATED_NEW"
        }

        var data;
        var msg;

        try {
            data = await documentClient.update(params).promise();
            msg = 'Service info updated';

            params = {
                TableName: 'Services',
                FilterExpression: '#category = :this_category AND #type = :this_type',
                ExpressionAttributeValues: {':this_category': prevCat, ':this_type': prevType},
                ExpressionAttributeNames: {'#category': 'category','#type':'type'},
            }

            try {
                data = await documentClient.scan(params).promise();

                if(data.Items.length === 0) {

                    params = {
                        TableName: 'Stock',
                        Key: {
                            type: 'Tabs',
                            name: prevCat + ',' + prevType
                        }
                    }

                    data = await documentClient.get(params).promise();

                    if(data.Item.image) {
                        var url = new URL(data.Item.image);
                        var key = url.pathname.substring(1);

                        await s3
                            .deleteObject({
                                Key: `tabs/${key}`,
                                Bucket: 'barbera-image'
                            })
                            .promise();
                    }

                    params = {
                        TableName: 'Stock',
                        Key: {
                            type: 'Tabs',
                            name: prevCat + ',' + prevType
                        }
                    }

                    data = await documentClient.delete(params).promise();
                }

                var na = prevName;

                if(prevName !== NAME) {
                    params = {
                        TableName: 'Stock',
                        Key: {
                            type: 'Sliders',
                            name: prevName
                        }
                    }

                    data = await documentClient.get(params).promise();

                    var img = data.Item.image;
                    na = NAME;

                    params = {
                        TableName: 'Stock',
                        Key: {
                            type: 'Sliders',
                            name: prevName
                        }
                    }

                    data = await documentClient.delete(params).promise();

                    params = {
                        TableName: 'Stock',
                        Item: {
                            type: 'Sliders',
                            name: NAME,
                            image: img
                        }
                    }

                    data = await documentClient.put(params).promise();
                }

                if(prevCat !== CAT) {
                    params = {
                        TableName: 'Stock',
                        Key: {
                            type: 'Sliders',
                            name: na
                        },
                        UpdateExpression: "set #category=:c",
                        ExpressionAttributeNames: {
                            '#category': 'category', 
                        },
                        ExpressionAttributeValues:{
                            ":c": CAT,
                        },
                        ReturnValues:"UPDATED_NEW"

                    }

                    data = await documentClient.update(params).promise();

                }

                console.log(na, typeof na);
                console.log(prevType, TYPE);

                if(prevType !== TYPE) {
                    params = {
                        TableName: 'Stock',
                        Key: {
                            type: 'Sliders',
                            name: na
                        },
                        UpdateExpression: "set #types=:t",
                        ExpressionAttributeNames: {
                            '#types': 'types', 
                        },
                        ExpressionAttributeValues:{
                            ":t": TYPE,
                        },
                        ReturnValues:"UPDATED_NEW"

                    }

                    data = await documentClient.update(params).promise();

                    console.log(TYPE);
                }

                params = {
                    TableName: 'Stock',
                    Key: {
                        type: 'Tabs',
                        name: CAT + ',' + TYPE
                    }
                }

                try {
                    data = await documentClient.get(params).promise();

                    if(!data.Item) {
                        params = {
                            TableName: 'Stock',
                            Item: {
                                type: 'Tabs',
                                name: prevCat + ',' + prevType
                            }
                        }
        
                        data = await documentClient.put(params).promise();
                    }

                    return {
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: true,
                            message: msg,
                        })
                    };
    
                } catch(err) {
                    return {
                        statusCode: 500,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: false,
                            message: err,
                        })
                    };
                }

            } catch(err) {
                return {
                    statusCode: 500,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: false,
                        message: err,
                    })
                };
            }

        } catch(err) {
            console.log("Error: ", err);
            msg = err;

            return {
                statusCode: 500,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
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