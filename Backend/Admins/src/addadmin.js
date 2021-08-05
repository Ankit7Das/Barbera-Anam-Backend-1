require('dotenv').config();

var AWS = require('aws-sdk');
var uuid = require('uuid');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
var nodemailer = require('nodemailer');
const { userVerifier } = require("./authentication");
const { passwordGenerator, hashPassword } = require('./password');

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var PHONE = obj.phone;
        var EMAIL = obj.email;
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
                statusCode: 404,
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

        var params = {
            TableName: 'Users',
            FilterExpression: '#email = :this_email',
            ExpressionAttributeValues: {':this_email': EMAIL},
            ExpressionAttributeNames: {'#email': 'email'},
        }

        var data = await documentClient.scan(params).promise();

        if(data.Items.length === 0) {
            params = {
                TableName: 'Users',
                FilterExpression: '#phone = :this_phone',
                ExpressionAttributeValues: {':this_phone': PHONE},
                ExpressionAttributeNames: {'#phone': 'phone'},
            }
    
            data = await documentClient.scan(params).promise();

            if(data.Items.length === 0) {

                var PASS = await passwordGenerator();
                var HASH = await hashPassword(PASS);

                params = {
                    TableName: 'Users',
                    Item: {
                        id: uuid.v1(),
                        email: EMAIL,
                        phone: PHONE,
                        role: 'admin',
                        password: HASH
                    }
                }
        
                try {
                    data = await documentClient.put(params).promise();

                    console.log(data);

                    var transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                          user: process.env.EMAIL_USER,
                          pass: process.env.EMAIL_PASS
                        }
                    });
            
                    var emails = EMAIL;
            
                    console.log(emails);
                      
                    var mailOptions = {
                        from: '"Barbera Admin" <' + process.env.EMAIL_USER + '>',
                        to: emails,
                        subject: 'Mail to add members to the Admin Website for Barbera',
                        text: `Hello,\n\tYou have been added as an admin for Barbera and have been granted access to the admin services and features through the admin website or app.\n\tYour credentials are: \n\t\tEmail: ${EMAIL}\n\t\tPassword: ${PASS}\n\tOnce you have Signed Up, you can change your password as you like.`
                    };
            
                    console.log(mailOptions);
            
                    data = await transporter.sendMail(mailOptions);

                    return {
                        statusCode: 200,
                        headers: {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        body: JSON.stringify({
                            success: true,
                            message: 'Referral Coupon updated',
                        })
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
                    }
                }
            } else {
                console.log("inside");
                return {
                    statusCode: 400,
                    headers: {
                        "Access-Control-Allow-Headers" : "Content-Type",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    body: JSON.stringify({
                        success: false,
                        message: 'User with this email already exists',
                    })
                }
            }
        } else {
            console.log("outside");
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Headers" : "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                body: JSON.stringify({
                    success: false,
                    message: 'User with this phone number already exists',
                })
            }
        }
        
    } catch(err) {
        console.log(err);
        return err;
    }
}