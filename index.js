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
app.use(express.json());
app.use(express.urlencoded());
app.use(express.text());
var socketMap = {};
wss.on('connection', function (ws, request) {
    var cookies = new Cookies(request, new http.ServerResponse(request), keys);
    var session = JSON.parse(Buffer.from(cookies.get('session') || '', 'base64').toString('utf8'));
    console.log(session);
    var serverId = session.serverId;
    var connection;
    if (serverId in socketMap) {
        socketMap[serverId].websockets.push(ws);
        connection = socketMap[serverId];
    }
    else {
        connection = { serverId: serverId, responseMap: {}, lastRequestKey: 0, websockets: [ws] };
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
        var contents;
        try {
            contents = JSON.parse(incomingResponse.json);
        }
        catch (_a) {
            contents = incomingResponse.json;
        }
        res.status(incomingResponse.statusCode).send(contents).end();
    });
    ws.ping();
    ws.on('pong', function () {
        setTimeout(function () {
            ws.ping();
        }, 45000);
    });
    ws.on('close', function () {
        console.log(serverId + ' closed!');
        // remove ws from server data
        connection.websockets = connection.websockets.filter(function (element) { return element != ws; });
        if (connection.websockets.length === 0) {
            console.log('removing ' + serverId + ' because empty');
            delete socketMap[serverId];
            console.log('active servers: ' + Object.keys(socketMap));
        }
    });
});
app.get('/', function (req, res) {
    if (req.session) {
        if (!req.session.serverId) {
            req.session.serverId = uuid_1.v4();
        }
    }
    res.sendFile(path.join(__dirname, './public', 'index.html'));
});
app.use('/public', express.static('public'));
app.all('/:serverId*', function (req, res) {
    var serverId = req.params.serverId;
    if (!(serverId in socketMap))
        return;
    var connection = socketMap[serverId];
    var requestKey = ++connection.lastRequestKey;
    connection.responseMap[requestKey] = res;
    var directUrl = req.url.substring(serverId.length + 1);
    if (directUrl == '') {
        directUrl = '/';
    }
    var requestData = { serverId: serverId, requestKey: requestKey, method: req.method, url: req.url, directUrl: directUrl, headers: req.headers, params: req.params, body: req.body, ip: req.ip, protocol: req.protocol, status: 'Open', date: new Date() };
    connection.websockets.forEach(function (ws) { return ws.send(JSON.stringify(requestData)); });
    req.on('aborted', function () {
        requestData.status = 'Closed';
        connection.websockets.forEach(function (ws) { return ws.send(JSON.stringify(requestData)); });
    });
});
server.listen(PORT, function () {
    console.log("App listening on port " + PORT + "!");
});
