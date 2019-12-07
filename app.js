/*
 * Starter Project for Messenger Platform Quick Start Tutorial
 *
 * Remix this as the starting point for following the Messenger Platform
 * quick start tutorial.
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 */

"use strict";

var names = {};

const https = require("https");
const PAGE_ACCESS_TOKEN =
  "EAAGn6YRpxRsBAAkTFfkAEwrr2ACKYjMUkmhfcHLZCrZAeshzc2KPKKGLySL199vV4NOcHbOtrXpLD3bmHdBvcSXibz42vVuMVOUdeYc8LDdPwZBrFIFanOI9JsV3HbG9UdiW4XydtffzwMCCtWrCkhls0ItCelZBIzsAgZB10ywZDZD";
/** UPDATE YOUR VERIFY TOKEN **/
const VERIFY_TOKEN = "habitbot";
// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Accepts POST requests at /webhook endpoint
app.post("/webhook", (req, res) => {
  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === "page") {
    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      //console.log('Sender PSID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        // Get the user's name
        if (!(sender_psid in names)) {
          https
            .get(
              "https://graph.facebook.com/" +
                sender_psid +
                "?fields=first_name,last_name,profile_pic&access_token=" +
                PAGE_ACCESS_TOKEN,
              resp => {
                let data = "";
                var jsonData;
                var name;

                // A chunk of data has been recieved.
                resp.on("data", chunk => {
                  data += chunk;
                });

                // The whole response has been received. Print out the result.
                resp.on("end", () => {
                  jsonData = JSON.parse(data);
                  name = jsonData["first_name"];
                  names[sender_psid] = name;
                  handleMessage(sender_psid, webhook_event.message);
                });
              }
            )
            .on("error", err => {
              console.log("Error: " + err.message);
            });
        } else {
          handleMessage(sender_psid, webhook_event.message);
        }
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    // Return a '200 OK' response to all events
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint
app.get("/webhook", (req, res) => {
  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

function firstEntity(nlp, name) {
  return nlp && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;
  let response_string;

  // Check if the message contains text
  if (received_message.text) {
    if (received_message.hasOwnProperty("quick_reply")) {
      const payload = received_message.quick_reply.payload;
      if (payload == "STATS") {
        response_string = "Here is how you are doing so far!";
      }
    } else {
      // check greeting is here and is confident
      const greeting = firstEntity(received_message.nlp, "greetings");
      if (greeting && greeting.confidence > 0.9) {
        response_string = "hello " + names[sender_psid];
      } else {
        sendQuickReplies(
          sender_psid,
          "How am I doing?",
          "Lets get Started...",
          "STATS"
        );
      }
    }
  }
  if (response_string) {
    // Create the payload for a basic text message
    response = {
      text: response_string
    };

    // Sends the response message
    callSendAPI(sender_psid, response);
  }
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {}

function sendQuickReplies(sender_psid, quick_reply, text, postback) {
  let request_body = {
    recipient: {
      id: sender_psid
    },
    messaging_type: "RESPONSE",
    message: {
      text: text,
      quick_replies: [
        {
          content_type: "text",
          title: quick_reply,
          payload: postback
        }
      ]
    }
  };

  // Send the HTTP request to the Messenger Platform
  request(
    {
      uri: "https://graph.facebook.com/v4.0/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body
    },
    (err, res, body) => {
      if (!err) {
        //console.log('Quick Reply sent!')
      } else {
        console.error("Unable to send quick reply:" + err);
      }
    }
  );
}

function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    recipient: {
      id: sender_psid
    },
    message: response
  };

  // Send the HTTP request to the Messenger Platform
  request(
    {
      uri: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: request_body
    },
    (err, res, body) => {
      if (!err) {
        //console.log('message sent!')
      } else {
        console.error("Unable to send message:" + err);
      }
    }
  );
}
