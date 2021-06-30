var AWS = require('aws-sdk');
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-southeast-1' });

module.exports.userVerifier = async (id) => {

    var params = {
        TableName: 'Users',
        Key: {
            id: id,
        }
    }

    var data = await documentClient.get(params).promise();

    if(!data.Item) {
        return false;
    } else if(data.Item.role == 'barber') {
        return true;
    } else {
        return false;
    }

}

// module.exports.serviceVerifier = async (id) => {

//     var params = {
//         TableName: 'Services',
//         Key: {
//             id: id,
//         }
//     }

//     var data = await documentClient.get(params).promise();

//     if(!data.Item) {
//         return false;
//     } else {
//         return true;
//     }

// }

// module.exports.addedBefore = async (serviceName) => {

//     var params = {
//         TableName: 'Services',
//         FilterExpression: '#name = :this_name',
//         ExpressionAttributeValues: {':this_name': serviceName},
//         ExpressionAttributeNames: {'#name': 'name'}
//     }

//     var data = await documentClient.scan(params).promise();

//     if(!data.Items) {
//         return true;
//     } else {
//         return false;
//     }

// }