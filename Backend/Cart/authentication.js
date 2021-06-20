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
    } else {
        return true;
    }

}

module.exports.addedBefore = async (userId, serviceId) => {

    var params = {
        TableName: 'Carts',
        Key: {
            userId: userId,
            serviceId: serviceId
        }
    }

    var data = await documentClient.get(params).promise();

    if(!data.Item) {
        return true;
    } else {
        return false;
    }

}