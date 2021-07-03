// require('dotenv').config();

// var AWS = require('aws-sdk');
// var uuid = require('uuid');
// var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
// var sns = new AWS.SNS({apiVersion: '2010-03-31'});
// var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-1' });
// const jwt = require("jsonwebtoken");
// const { JWT_SECRET } = process.env;
// const { userVerifier, addedBefore, serviceVerifier } = require("./authentication");


// exports.referinvite = async (event) => {
//     try {
//         var token = event.headers.token;

//         var random = Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);

//         if(token == null) {
//             return {
//                 statusCode: 401,
//                 body: JSON.stringify({
//                     success: false,
//                     message: "No token passed"
//                 })
//             };
//         }

//         var userID;

//         try {
//             userID = jwt.verify(token, JWT_SECRET);
//         } catch(err) {
//             return {
//                 statusCode: 403,
//                 body: JSON.stringify({
//                     success: false,
//                     message: "Invalid Token",
//                 })
//             };
//         }

//         var exist1 = await userVerifier(userID.id);

//         if(exist1 == false) {
//             return {
//                 statusCode: 404,
//                 body: JSON.stringify({
//                     message: 'User not found or user not an admin',
//                     s: false,
//                 })
//             }
//         }

//         var params = {
//             TableName: 'BarbersLog',
//             Key: {
//                 id: userID.id,
//             }
//         }

//         var data = await documentClient.get(params).promise();

//         if(!data.Item) {

//             params = {
//                 TableName: 'BarbersLog',
//                 Item: {
//                     id: userID.id,
//                     long: LONG,
//                     lat: LAT,
//                 }
//             }

//             try {
//                 data = await documentClient.put(params).promise();
//                 return {
//                     statusCode: 200,
//                     body: JSON.stringify({
//                         success: true,
//                         message: 'Barber location inserted',
//                     })
//                 }
//             } catch(err) {
//                 return {
//                     statusCode: 500,
//                     body: JSON.stringify({
//                         success: false,
//                         message: err,
//                     })
//                 };
//             }

//         } else {

//             params = {
//                 TableName: 'BarbersLog',
//                 Key: {
//                     id: userID.id,
//                 },
//                 UpdateExpression: "set #long=:lo, #lang=:la",
//                 ExpressionAttributeNames: {
//                     '#long': 'long',
//                     '#lat': 'lat',
//                 },
//                 ExpressionAttributeValues:{
//                     ":lo": LONG,
//                     ":la": LAT,
//                 },
//                 ReturnValues:"UPDATED_NEW"
//             };
    
//             try {
//                 data = await documentClient.update(params).promise();
    
//                 return {
//                     statusCode: 200,
//                     body: JSON.stringify({
//                         success: true,
//                         message: 'Barber location updated',
//                     })
//                 };
//             } catch(err) {
    
//                 return {
//                     statusCode: 500,
//                     body: JSON.stringify({
//                         success: false,
//                         message: err,
//                     })
//                 };
//             }

//         }

//     } catch(err) {
//         console.log(err);
//         return err;
//     }
// }