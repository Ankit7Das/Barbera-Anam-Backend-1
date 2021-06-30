require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");


exports.addservice = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var NAME = obj.name;
        var PRICE = obj.price;
        var TIME = obj.time;
        var DET = obj.details;
        var DISC = obj.discount;
        var DOD = obj.dod;
        var ICON = obj.icon;
        var GENDER = obj.gender;
        var TYPE = obj.type;
        // var token = event.headers.token;

        // if(token == null) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "No token passed"
        //         })
        //     };
        // }

        // var userID;

        // try {
        //     userID = jwt.verify(token, JWT_SECRET);
        // } catch(err) {
        //     return {
        //         statusCode: 403,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "Invalid Token",
        //         })
        //     };
        // }

        // var exist1 = await userVerifier(userID.id);

        // if(exist1.success == false) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not found',
        //         })
        //     }
        // }

        // if(exist1.user.role != 'admin') {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not an admin',
        //         })
        //     }
        // }
        
        var exist2 = await addedBefore(NAME);

        if(exist2 == true) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Service already added',
                })
            }
        }

        var params = {
            TableName: 'Services',
            Item: {
                id: uuid.v1(),
                name: NAME,
                price: PRICE,
                time: TIME,
                details: DET ? DET : null,
                discount: DISC ? DISC : null,
                icon: ICON ? ICON : null,
                dealOfDay: DOD ? DOD : false,
                type: TYPE,
                gender: GENDER,
                trending: false
            }
        }

        var data;
        var msg;

        try {
            data = await documentClient.put(params).promise();
            msg = 'Service added to database';

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

exports.delservice = async (event) => {
    try {

        var serviceId = event.pathParameters.serviceid;
        // var token = event.headers.token;

        // if(token == null) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "No token passed"
        //         })
        //     };
        // }

        // var userID;

        // try {
        //     userID = jwt.verify(token, JWT_SECRET);
        // } catch(err) {
        //     return {
        //         statusCode: 403,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "Invalid Token",
        //         })
        //     };
        // }

        // var exist1 = await userVerifier(userID.id);

        // if(exist1.success == false) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not found',
        //         })
        //     }
        // }

        // if(exist1.user.role != 'admin') {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not an admin',
        //         })
        //     }
        // }
        
        var exist2 = await serviceVerifier(serviceId);

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: 'Service doesn\'t exist',
                    success: false,
                })
            }
        }

        var params = {
            TableName: 'Services',
            Key: {
                id: serviceId,
            }
        }

        var data;
        var msg;

        try {
            data = await documentClient.delete(params).promise();
            msg = 'Service deleted from database';

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

exports.getservicebyid = async (event) => {
    try {

        var serviceId = event.pathParameters.serviceid;
        // var token = event.headers.token;
        
        // if(token == null) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "No token passed"
        //         })
        //     };
        // }

        // var userID;

        // try {
        //     userID = jwt.verify(token, JWT_SECRET);
        // } catch(err) {
        //     return {
        //         statusCode: 403,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "Invalid Token",
        //         })
        //     };
        // }

        // var exist1 = await userVerifier(userID.id);

        // if(exist1.success == false) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not found',
        //         })
        //     }
        // }

        // if(exist1.user.role != 'admin') {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not an admin',
        //         })
        //     }
        // }
        
        var exist2 = await serviceVerifier(serviceId);

        if(exist2.success == false) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'Service not found',
                })
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Service found',
                data: exist2.service
            })
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.updateservice = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var ID = obj.id;
        var NAME = obj.name;
        var PRICE = obj.price;
        var TIME = obj.time;
        var DET = obj.details;
        var DISC = obj.discount;
        var DOD = obj.dod;
        var ICON = obj.icon;
        var GENDER = obj.gender;
        var TYPE = obj.type;
        // var token = event.headers.token;

        // if(token == null) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "No token passed"
        //         })
        //     };
        // }

        // var userID;

        // try {
        //     userID = jwt.verify(token, JWT_SECRET);
        // } catch(err) {
        //     return {
        //         statusCode: 403,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "Invalid Token",
        //         })
        //     };
        // }

        // var exist1 = await userVerifier(userID.id);

        // if(exist1.success == false) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not found',
        //         })
        //     }
        // }

        // if(exist1.user.role != 'admin') {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not an admin',
        //         })
        //     }
        // }
        
        var exist2 = await serviceVerifier(ID);

        if(exist2.success == false) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'No such service exists for updating',
                })
            }
        }

        var params = {
            TableName: 'Services',
            Key: {
                id: ID,
            },
            UpdateExpression: "set #name=:n, #price=:p, #time=:ti, #details=:det, #discount=:dis, #icon=:i, #deal=:dod, #type=:t, #gender=:g",
            ExpressionAttributeNames: {
                '#name': 'name',
                '#price': 'price',
                '#time': 'time',
                '#details': 'details',
                '#discount': 'discount',
                '#icon': 'icon',
                '#deal': 'dealOfDay',
                '#type': 'type',
                '#gender': 'gender', 
            },
            ExpressionAttributeValues:{
                ":n": NAME,
                ":p": PRICE,
                ":ti": TIME,
                ":det": DET ? DET : null,
                ":dis": DISC ? DISC : null,
                ":i": ICON ? ICON : null,
                ":dod": DOD ? DOD : false,
                ":t": TYPE,
                ":g": GENDER,
            },
            ReturnValues:"UPDATED_NEW"
        }

        var data;
        var msg;

        try {
            data = await documentClient.update(params).promise();
            msg = 'Service info updated';

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

exports.getallservicenames = async (event) => {
    try {

        // var token = event.headers.token;

        // if(token == null) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "No token passed"
        //         })
        //     };
        // }

        // var userID;

        // try {
        //     userID = jwt.verify(token, JWT_SECRET);
        // } catch(err) {
        //     return {
        //         statusCode: 403,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "Invalid Token",
        //         })
        //     };
        // }

        // var exist1 = await userVerifier(userID.id);

        // if(exist1.success == false) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not found',
        //         })
        //     }
        // }

        // if(exist1.user.role != 'admin') {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not an admin',
        //         })
        //     }
        // }

        var params = {
            TableName: 'Services',
            ProjectionExpression: "#id, #name",
            ExpressionAttributeNames: {
                "#name": "name",
                "#id": 'id'
            },
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length != 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Service list',
                    data: data.Items
                })
            }
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'No service entered'
                })
            }
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.gettrending = async (event) => {
    try {

        // var token = event.headers.token;

        // if(token == null) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "No token passed"
        //         })
        //     };
        // }

        // var userID;

        // try {
        //     userID = jwt.verify(token, JWT_SECRET);
        // } catch(err) {
        //     return {
        //         statusCode: 403,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "Invalid Token",
        //         })
        //     };
        // }

        // var exist1 = await userVerifier(userID.id);

        // if(exist1.success == false) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not found',
        //         })
        //     }
        // }

        // if(exist1.user.role != 'user') {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not an admin',
        //         })
        //     }
        // }

        var params = {
            TableName: 'Services',
            FilterExpression: '#trend = :this_trend',
            ExpressionAttributeValues: {':this_trend': true},
            ExpressionAttributeNames: {'#trend': 'trending'}
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length == 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'No trending services'
                })
            }
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Trending services',
                    data: data.Items
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}

exports.getservicebytype = async (event) => {
    try {

        var GENDER = event.pathParameters.gender;
        var TYPE = event.pathParameters.type;
        // var token = event.headers.token;

        // if(token == null) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "No token passed"
        //         })
        //     };
        // }

        // var userID;

        // try {
        //     userID = jwt.verify(token, JWT_SECRET);
        // } catch(err) {
        //     return {
        //         statusCode: 403,
        //         body: JSON.stringify({
        //             success: false,
        //             message: "Invalid Token",
        //         })
        //     };
        // }

        // var exist1 = await userVerifier(userID.id);

        // if(exist1.success == false) {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not found',
        //         })
        //     }
        // }

        // if(exist1.user.role != 'user') {
        //     return {
        //         statusCode: 400,
        //         body: JSON.stringify({
        //             success: false,
        //             message: 'User not an admin',
        //         })
        //     }
        // }

        var params = {
            TableName: 'Services',
            FilterExpression: '#gender = :this_gender AND #type = :this_type',
            ExpressionAttributeValues: {':this_gender': GENDER, ':this_type': TYPE},
            ExpressionAttributeNames: {'#gender': 'gender', '#type': 'type'}
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length == 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    success: false,
                    message: 'No Services found'
                })
            }
        } else {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'Services found',
                    data: data.Items
                })
            }
        }

    } catch(err) {
        console.log(err);
        return err;
    }
}


