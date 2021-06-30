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
    } else if(data.Item.role=='user') {
        return true;
    } else {
        return false;
    }

}

module.exports.dateSyn = async (date) => {

    var dd = String(date.getDate()).padStart(2, '0');
    var mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = date.getFullYear();

    var res = dd + '-' + mm + '-' + yyyy;

    return res;

}