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
var keys = [process.env.KEY0 || uuid_1.v4(), process.env.KEY1 || uuid_1.v4()];
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
    ws.ping();
    ws.on('pong', function () {
        setTimeout(function () {
            ws.ping();
        }, 45000);
    });
});
app.get('/', function (req, res) {
    if (req.session && !req.session.serverId) {
        req.session.serverId = uuid_1.v4();
    }
    res.sendFile(path.join(__dirname, './public', 'index.html'));
});
app.use('/public', express.static('public'));
app.all('/:serverId*', function (req, res) {
    var serverId = req.params.serverId;
    if (!(serverId in socketMap))
        return;
    var connection = socketMap[serverId];
    connection.responseMap[++connection.lastRequestKey] = res;
    var requestData = { serverId: serverId, requestKey: connection.lastRequestKey, method: req.method, url: req.url, headers: req.headers, params: req.params, body: req.body };
    connection.ws.send(JSON.stringify(requestData));
});
app.use(express.json());
app.use(express.urlencoded());
server.listen(PORT, function () {
    console.log("App listening on port " + PORT + "!");
});
