var request = require('request');
require('dotenv').config()
var api = require('clicksend');

var smsApi = new api.SMSApi(process.env.CLICK_SEND_USERNAME, process.env.CLICK_SEND_KEY);

function getQuote(category) {
  const URL = `http://quotes.rest/qod.json?category=${category}`;
  request(URL, function (error, response, body) {
    if(!!error) {
      return;
    }
    const data = JSON.parse(body);
    const quotes = ((data && data.contents && data.contents.quotes) ? data.contents.quotes : []);
    if(quotes.length > 0) {
      const quote = quotes[0].quote;
      const numbers = process.env.NUMBERS.split(',');
      var smsCollection = new api.SmsMessageCollection();
      smsCollection.messages = numbers.map((number) => {
        const message = new api.SmsMessage();
        message.source = "sdk";
        message.to = number;
        message.body = `Quote of the day: ${quote}`;
        return message;
      });

      smsApi.smsSendPost(smsCollection).then(function(response) {
        console.log(response.body);
      }).catch(function(err){
        console.error(err.body);
      });
    }
  });
};

getQuote('inspire');
