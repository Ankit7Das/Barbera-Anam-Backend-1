require('dotenv').config();

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env;

module.exports.tokenVerify = (token) => {
  jwt.verify(token, JWT_SECRET, (err, userID) => {
    if (err) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          success: false,
          message: "Token is invalid"
        })
      };
    } 
    return {
      success: true,
      id: userID,
    }
  })
};