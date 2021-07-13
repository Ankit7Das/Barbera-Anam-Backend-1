require('dotenv').config();

var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var sns = new AWS.SNS({apiVersion: '2010-03-31'});
var nodemailer = require('nodemailer');
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;
const { userVerifier } = require("./authentication");

exports.handler = async (event) => {
    try {

        var obj = JSON.parse(event.body);
        var tokenArray = event.headers.Authorization.split(" ");
        var token = tokenArray[1];
        var BODY = obj.body;
        var SUB = obj.subject;
        var TO = obj.to;

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

        if(exist1.user.role != 'admin') {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: 'Not an admin',
                })
            }
        }

        var transporter = nodemailer.createTransport({
            // host: 'smtp.gmail.com',
            // port: 587,
            // secure: false, 
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
        });

        // var transporter = nodemailer.createTransport(smtpTransport({
        //     service: 'gmail',
        //     auth: {
        //         user: 'itsankit176@gmail.com',
        //         pass: process.env.EMAIL_PASS
        //     }
        // }));

        var params = {
            TableName: 'Users',
            FilterExpression: '#role = :this_role',
            ExpressionAttributeValues: {':this_role': TO},
            ExpressionAttributeNames: {'#role': 'role'},
        }

        var data = await documentClient.scan(params).promise();

        var emails = [];

        for(var i=0;i<data.Items.length;i++) {
            if(data.Items[i].email) {
                emails.push(data.Items[i].email);
                // if(i < data.Items.length-1) {
                //     emails += ', ';
                // }
            }
        }

        console.log(emails);

        if(emails === []) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    success: false,
                    message: `Emails have not been added by any ${TO} `
                })
            }
        }
          
        var mailOptions = {
            from: 'satoupenD@gmail.com',
            to: 'ankit_1901ee74@iitp.ac.in',
            subject: SUB,
            text: BODY
        };

        console.log(mailOptions);


        await transporter.sendMail(mailOptions, function(error, info) {
            if(error) {
                console.log(error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        success: false,
                        message: 'Unable to send emails'
                    })
                }
            
            } else {
                console.log('Email sent', info);
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        success: true,
                        message: 'Email sent'
                    })
                }
            }
        });

        // data = await transporter.sendMail(mailOptions);

        // console.log("data",data);
        
        
    } catch(err) {
        console.log(err);
        return err;
    }
}