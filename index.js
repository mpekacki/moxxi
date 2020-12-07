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
    var predefinedResponses = session.predefinedResponses;
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
    var endpointData = { serverId: serverId, predefinedResponses: predefinedResponses };
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
        res.status(incomingResponse.statusCode).send(contents);
    });
    ws.ping();
    ws.on('pong', function () {
        setTimeout(function () {
            ws.ping();
        }, 45000);
    });
});
app.get('/', function (req, res) {
    if (req.session) {
        if (!req.session.serverId) {
            req.session.serverId = uuid_1.v4();
        }
        if (!req.session.predefinedResponses) {
            req.session.predefinedResponses = [
                {
                    id: 0,
                    name: '200 {}',
                    statusCode: 200,
                    json: '{}'
                },
                {
                    id: 1,
                    name: '404 {}',
                    statusCode: 404,
                    json: '{}'
                }
            ];
        }
    }
    res.sendFile(path.join(__dirname, './public', 'index.html'));
});
app.post('/predefined-response', function (req, res) {
    var predefinedResponse = req.body;
    if (req.session) {
        req.session.predefinedResponses.push(predefinedResponse);
        console.log(req.session);
        res.status(201).send();
        return;
    }
    res.status(500);
});
app.patch('/predefined-response', function (req, res) {
    var predefinedResponse = req.body;
    if (req.session) {
        var toModify = req.session.predefinedResponses.find(function (r) { return r.id == predefinedResponse.id; });
        if (toModify) {
            toModify = Object.assign(toModify, predefinedResponse);
            res.status(200);
            return;
        }
    }
    res.status(500);
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
    connection.ws.send(JSON.stringify(requestData));
    req.on('aborted', function () {
        requestData.status = 'Closed';
        connection.ws.send(JSON.stringify(requestData));
    });
});
server.listen(PORT, function () {
    console.log("App listening on port " + PORT + "!");
});
