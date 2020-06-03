require("dotenv").load();

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const SmsProxy = require("./my_sms_proxy");

const app = express();
const smsProxy = new SmsProxy();

let users = Array();

app.use(express.static("public"));

app.use(
  session({
    secret: "loadsofrandomstuff",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "pug");

app.get("/", (req, res) => {
  // On index.html is verified if the session was started using the mobile number, if there is not any session the sign-in is requested.
    
  if (!req.session.user) {
    res.render("index", {
      brand: smsProxy.brand,
    });
  } else {
    res.render("index", {
      number: req.session.user.number,
      brand: smsProxy.brand,
      drivers: users.filter((user) => user.role === "driver"),
      role: req.session.user.role,
    });
  }
});

app.get("/sign_in", (req, res) => {
  // The sign_in page is displayed
  res.render("sign_in");
});

app.post("/verify_code", async (req, res) => {
  // The verification process is run
  const user = {
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    number: req.body.number,
    role: req.body.role,
  };

  try {
    const result = await smsProxy.requestCode(user.number);
    user.verifyRequestId = result;

    // The user current users are saved
    users.push(user);
    console.log(`request_id: ${user.verifyRequestId}`);

    // The page to verify the code is displayed
    res.render("verify_code", {
      requestid: user.verifyRequestId,
    });
  } catch (err) {
    console.error(err);
  }
});

app.post("/check-code", async (req, res) => {
  // The code provided is verified
  const user = users.filter(
    (user) => user.verifyRequestId === req.body.requestid
  )[0];

  try {
    const result = await smsProxy.checkVerificationCode(
      req.body.requestid,
      req.body.code
    );
    if (result.status == 0) {
      // If the code is valid the user session is started
      req.session.user = {
        number: user.number,
        role: user.role,
      };
    }
    res.redirect("/");
  } catch (err) {
    console.error(err);
  }
});

//The session is sign-out
app.get("/sign_out", (req, res) => {
  users = users.filter((user) => user.number != req.session.user.number);
  req.session.destroy();
  res.redirect("/");
});

app.post("/im", (req, res) => {
  const user = req.body.user;
  const driver = req.body.driver;

  //The chat is started
  smsProxy.createChat(user, driver, (err, result) => {
    if (err) {
      res.status(500).json(err);
    } else {
      res.json(result);
    }
  });
  res.send("The chat is started:");
});

app.get("/webhooks/inbound-sms", (req, res) => {
  const from = req.query.msisdn;
  const to = req.query.to;
  const text = req.query.text;

  console.log("got message from", from);

  // The Virtual name is routed to the Real number
  smsProxy.proxySms(from, text);

  res.sendStatus(204);
});


//The initial port of app is set to 3000
const server = app.listen(3000, () => {
  console.log(`The server is running on port ${server.address().port}`);
});
