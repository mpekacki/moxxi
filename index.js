"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// lib/app.ts
var express = require("express");
var WebSocket = require("ws");
var http = require("http");
var uuid_1 = require("uuid");
var cookieSession = require("cookie-session");
var path = require("path");
var Cookies = require("cookies");
var PORT = process.env.PORT || 5000;
// Create a new express application instance
var app = express();
var server = http.createServer(app);
var wss = new WebSocket.Server({ server: server });
var keys = [uuid_1.v4(), uuid_1.v4()];
app.use(cookieSession({
    name: 'session',
    keys: keys
}));
var socketMap = {};
wss.on('connection', function (ws, request) {
    var cookies = new Cookies(request, new http.ServerResponse(request), keys);
    var session = JSON.parse(Buffer.from(cookies.get('session') || '', 'base64').toString('utf8'));
    var serverId = session.serverId;
    var connection;
    if (serverId in socketMap) {
        socketMap[serverId].ws.terminate();
        socketMap[serverId].ws = ws;
        connection = socketMap[serverId];
    }
    else {
        connection = { serverId: serverId, responseMap: {}, lastRequestKey: 0, ws: ws };
        socketMap[serverId] = connection;
    }
    var endpointData = { serverId: serverId };
    ws.send(JSON.stringify(endpointData));
    ws.on('message', function (message) {
        var incomingResponse = JSON.parse(message);
        if (!(incomingResponse.requestKey in connection.responseMap))
            return;
        var res = connection.responseMap[incomingResponse.requestKey];
        if (res.headersSent)
            return;
        res.status(incomingResponse.statusCode).json(JSON.parse(incomingResponse.json));
    });
});
app.get('/', function (req, res) {
    if (req.session && !req.session.serverId) {
        req.session.serverId = uuid_1.v4();
        var serverId_1 = req.session.serverId;
        app.all('/' + serverId_1 + '*', function (req, res) {
            if (!(serverId_1 in socketMap))
                return;
            var connection = socketMap[serverId_1];
            connection.responseMap[++connection.lastRequestKey] = res;
            var requestData = { serverId: serverId_1, requestKey: connection.lastRequestKey, method: req.method, url: req.url, headers: req.headers, params: req.params, body: req.body };
            connection.ws.send(JSON.stringify(requestData));
        });
    }
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});
app.use(express.json());
app.use(express.urlencoded());
server.listen(PORT, function () {
    console.log("App listening on port " + PORT + "!");
});
