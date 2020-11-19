"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PORT = process.env.PORT || 5000;
// lib/app.ts
var express = require("express");
var WebSocket = require("ws");
// Create a new express application instance
var app = express();
var wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', function (ws) {
    var serverId = Math.random().toString(36).substring(7);
    var requests = {};
    var lastRequestKey = 0;
    var endpointData = { serverId: serverId };
    ws.send(JSON.stringify(endpointData));
    ws.on('message', function (message) {
        var incomingResponse = JSON.parse(message);
        if (incomingResponse.requestKey in requests) {
            var res = requests[incomingResponse.requestKey];
            if (!res.headersSent) {
                res.status(incomingResponse.statusCode).json(JSON.parse(incomingResponse.json));
            }
        }
    });
    app.all('/' + serverId + '*', function (req, res) {
        requests[++lastRequestKey] = res;
        var requestData = { serverId: serverId, requestKey: lastRequestKey, method: req.method, url: req.url, headers: req.headers, params: req.params, body: req.body };
        console.log(requestData);
        ws.send(JSON.stringify(requestData));
    });
});
app.use('/', express.static('public'));
app.use(express.json());
app.use(express.urlencoded());
app.listen(PORT, function () {
    console.log(`Example app listening on port ${ PORT }!`);
});
