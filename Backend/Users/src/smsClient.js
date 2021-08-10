//This code was posted for an article at https://codingislove.com/send-sms-developers/

const axios = require("axios");
require('dotenv').config();

const tlClient = axios.create({
  baseURL: "https://api.textlocal.in/",
  params: {
    apiKey: process.env.API_KEY, //Text local api key
    sender: "BARBHS"
  }
});

const smsClient = {
  sendPartnerWelcomeMessage: user => {
    if (user && user.phone && user.random) {
      const params = new URLSearchParams();
      params.append("numbers", [parseInt("91" + user.phone)]);
      params.append(
        "message",
        
      );
      tlClient.post("/send", params);
    }
  },
  sendVerificationMessage: user => {
    if (user && user.phone) {
      const params = new URLSearchParams();
      params.append("numbers", [parseInt("91" + user.phone)]);
      params.append(
        "message",
        `${user.random} is your verification code for Barbera: Salon Service at your Home.`
      );
      console.log(params);
      var res = tlClient.post("/send", params);
      console.log(res);
    }
  }
};

module.exports = smsClient;

// Now import the client in any other file or wherever required and run these functions
// const smsClient = require("./smsClient");
// smsClient.sendVerificationMessage(user)