const Nexmo = require("nexmo");

class SmsProxy {
  constructor() {
    this.nexmo = new Nexmo({
      apiKey: process.env.NEXMO_API_KEY,
      apiSecret: process.env.NEXMO_API_SECRET,
    });
    this.brand = process.env.NEXMO_BRAND_NAME;
    this.chats = new Array();
  }

  _sendSms(from, to, message) {
    return new Promise((resolve, reject) => {
      this.nexmo.message.sendSms(from, to, message, (err, responseData) => {
        if (err) {
          reject(err);
        } else {
          console.log("the sms is send", responseData);
          resolve(responseData);
        }
      });
    });
  }

  requestCode(verifyRequestNumber) {
    return new Promise((resolve, reject) => {
      this.nexmo.verify.request(
        {
          number: verifyRequestNumber,
          brand: this.brand,
        },
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log("The verification code was requested", result);
            resolve(result.request_id);
          }
        }
      );
    });
  }

  checkVerificationCode(verifyRequestId, code) {
    console.log(`checking code ${code} for ${verifyRequestId}`);
    return new Promise((resolve, reject) => {
      this.nexmo.verify.check(
        {
          request_id: verifyRequestId,
          code,
        },
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log("The code is verified", result);
            resolve(result);
          }
        }
      );
    });
  }

  async sendSMS(user, driver) {
    try {
      // The message is send from user to the virtual number
      await this._sendSms(
        process.env.VIRTUAL_NUMBER,
        user,
        "Reply this SMS to chat with deliverer"
      );


      // The message is send from user to the virtual number
      await this._sendSms(
        process.env.VIRTUAL_NUMBER,
        driver,
        "Reply this SMS to chat with buyer"
      );
    } catch (err) {
      console.log("An error to send the message");
    }
  }

  createChat(user, driver) {
    console.log(`The chat is creating for ${user} and ${driver}`);
    this.chats.push({
      user,
      driver,
    });

    this.sendSMS(user, driver);
  }

  getDestinationRealNumber(from) {
    console.log('The numbers are searching in chats', this.chats);
    const chat = this.chats.filter(
      (chat) => chat.user === from || chat.driver === from
    )[0];
    console.log('The chat was not found:', chat)
    let destinationRealNumber = null;

    // Using the number to sending the sms
    const user = from === chat.user;
    const driver = from === chat.driver;

    if (user || driver) {
      destinationRealNumber = user ? chat.driver : chat.user;
    }

    return destinationRealNumber;
  }

  async proxySms(from, text) {
    // Send the sms using real number
    try {
      const destinationRealNumber = this.getDestinationRealNumber(from);

      if (destinationRealNumber === null) {
        console.log(`This number does not have active chat`);
        return;
      }

      // Send the sms from the virtual number to the real number
      await this._sendSms(
        process.env.VIRTUAL_NUMBER,
        destinationRealNumber,
        text
      );
    } catch (err) {
      console.error("The sms cannot deliver:", err);
    }
  }
}

module.exports = SmsProxy;
