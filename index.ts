// lib/app.ts
import express = require('express');
import WebSocket = require('ws');
import http = require('http');
import { v4 as uuidv4 } from 'uuid';
import cookieSession = require('cookie-session');
import path = require('path');
import Cookies = require('cookies');

const PORT = process.env.PORT || 5000;
// Create a new express application instance
const app: express.Application = express();
const server = http.createServer(app);
const wss: WebSocket.Server = new WebSocket.Server({ server: server });

const keys = [process.env.KEY0 || uuidv4(), process.env.KEY1 || uuidv4()];

app.use(cookieSession({
  name: 'session',
  keys: keys
}));

app.use(express.json());
app.use(express.urlencoded());
app.use(express.text());

interface Connection {
  serverId: string,
  responseMap: ResponseMap,
  lastRequestKey: number,
  ws: WebSocket
}

interface ConnectionMap {
  [key: string]: Connection
}

interface ResponseMap {
  [key: number]: express.Response
}

interface IncomingResponse {
  requestKey: number,
  statusCode: number,
  json: string
}

interface EndpointData {
  serverId: string
}

interface RequestData {
  serverId: string,
  requestKey: number,
  url: string,
  method: string,
  headers: object,
  params: object,
  body: string,
  ip: string,
  protocol: string,
  status: string
}

const socketMap: ConnectionMap = {};

wss.on('connection', (ws, request) => {
  const cookies = new Cookies(request, new http.ServerResponse(request), keys);
  const session = JSON.parse(Buffer.from(cookies.get('session') || '', 'base64').toString('utf8'));
  const serverId = session.serverId;
  let connection: Connection;
  if (serverId in socketMap) {
    socketMap[serverId].ws.terminate();
    socketMap[serverId].ws = ws;
    connection = socketMap[serverId];
  } else {
    connection = {serverId: serverId, responseMap: {}, lastRequestKey: 0, ws: ws};
    socketMap[serverId] = connection;
  }
  const endpointData: EndpointData = { serverId: serverId };
  ws.send(JSON.stringify(endpointData));

  ws.on('message', message => {
    const incomingResponse: IncomingResponse = JSON.parse(<string>message);
    if (!(incomingResponse.requestKey in connection.responseMap)) return;
    const res = connection.responseMap[incomingResponse.requestKey];
    if (res.headersSent) return;
    let contents;
    try {
        contents = JSON.parse(incomingResponse.json);
    } catch {
        contents = incomingResponse.json;
    }
    res.status(incomingResponse.statusCode).send(contents);
  });

  ws.ping();
  ws.on('pong', () => {
      setTimeout(() => {
          ws.ping();
      }, 45000);
  });
});

app.get('/', (req, res) => {
  if (req.session && !req.session.serverId) {
    req.session.serverId = uuidv4();
  }
  res.sendFile(path.join(__dirname, './public', 'index.html'));
});

app.use('/public', express.static('public'));

app.all('/:serverId*', (req, res) => {
  const serverId = req.params.serverId;
  if (!(serverId in socketMap)) return;
  const connection = socketMap[serverId];
  const requestKey = ++connection.lastRequestKey;
  connection.responseMap[requestKey] = res;
  const requestData: RequestData = { serverId: serverId, requestKey: requestKey, method: req.method, url: req.url, headers: req.headers, params: req.params, body: req.body, ip: req.ip, protocol: req.protocol, status: 'Open' };
  connection.ws.send(JSON.stringify(requestData));

  req.on('aborted', () => {
    requestData.status = 'Closed';
    connection.ws.send(JSON.stringify(requestData));
  });
});

server.listen(PORT, function () {
  console.log(`App listening on port ${PORT}!`);
});