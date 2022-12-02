import express = require("express");
import WebSocket = require("ws");
import http = require("http");
import { v4 as uuidv4 } from "uuid";
import cookieSession = require("cookie-session");
import path = require("path");
import Cookies = require("cookies");

const PORT = process.env.PORT || 5000;
// Create a new express application instance
const app: express.Application = express();
const server = http.createServer(app);
const wss: WebSocket.Server = new WebSocket.Server({ server: server });

// Provide config vars with secret keys to enable session (which contains unique endpoint ID) continuity between app restarts.
// More info about keys: http://expressjs.com/en/resources/middleware/cookie-session.html
const keys = [process.env.KEY0 || uuidv4(), process.env.KEY1 || uuidv4()];

const responseBodyAllowed = !!process.env.ALLOW_BODY;
const password = process.env.PASSWORD;
const passwordRequired = !!password;

app.use(
  cookieSession({
    name: "session",
    keys: keys,
  })
);

app.use(express.json());
app.use(express.urlencoded());
app.use(express.text());

interface Connection {
  serverId: string;
  responseMap: ResponseMap;
  lastRequestKey: number;
  websockets: WebSocket[];
}

interface ConnectionMap {
  [key: string]: Connection;
}

interface ResponseMap {
  [key: number]: express.Response;
}

interface IncomingResponse {
  requestKey: number;
  statusCode: number;
  json: string;
  password?: string;
}

interface EndpointData {
  serverId: string;
  responseBodyAllowed: boolean;
  passwordRequired: boolean;
}

interface RequestData {
  serverId: string;
  requestKey: number;
  url: string;
  directUrl: string;
  method: string;
  headers: object;
  params: object;
  body: string;
  ip: string;
  protocol: string;
  status: string;
  date: Date;
}

const socketMap: ConnectionMap = {};

wss.on("connection", (ws, request) => {
  const cookies = new Cookies(request, new http.ServerResponse(request), keys);
  const session = JSON.parse(
    Buffer.from(cookies.get("session") || "", "base64").toString("utf8")
  );
  console.log(session);
  const serverId = session.serverId;
  let connection: Connection;
  if (serverId in socketMap) {
    socketMap[serverId].websockets.push(ws);
    connection = socketMap[serverId];
  } else {
    connection = {
      serverId: serverId,
      responseMap: {},
      lastRequestKey: 0,
      websockets: [ws],
    };
    socketMap[serverId] = connection;
  }
  const endpointData: EndpointData = {
    serverId: serverId,
    responseBodyAllowed: responseBodyAllowed,
    passwordRequired: passwordRequired,
  };
  ws.send(JSON.stringify(endpointData));

  ws.on("message", (message) => {
    const incomingResponse: IncomingResponse = JSON.parse(<string>message);
    if (passwordRequired) {
      const failedPasswords = parseInt(process.env.FAILED_PASSWORDS || "0");
      if (failedPasswords >= 100) {
        console.log("Too many failed password attempts");
        return;
      }
      if (incomingResponse.password !== password) {
        console.log("Incorrect password");
        process.env.FAILED_PASSWORDS = (failedPasswords + 1).toString();
        return;
      }
    }
    if (!(incomingResponse.requestKey in connection.responseMap)) return;
    const res = connection.responseMap[incomingResponse.requestKey];
    if (res.headersSent) return;
    let contents;
    if (responseBodyAllowed) {
      try {
        contents = JSON.parse(incomingResponse.json);
      } catch {
        contents = incomingResponse.json;
      }
    } else {
      contents = {};
    }
    res.status(incomingResponse.statusCode).send(contents).end();
    delete connection.responseMap[incomingResponse.requestKey];
  });

  ws.ping();
  ws.on("pong", () => {
    setTimeout(() => {
      ws.ping();
    }, 45000);
  });

  ws.on("close", () => {
    console.log(serverId + " closed!");
    // remove ws from server data
    connection.websockets = connection.websockets.filter(
      (element) => element != ws
    );
    if (connection.websockets.length === 0) {
      console.log("removing " + serverId + " because empty");
      delete socketMap[serverId];
      console.log("active servers: " + Object.keys(socketMap));
    }
  });
});

app.get("/", (req, res) => {
  if (req.session) {
    if (!req.session.serverId) {
      req.session.serverId = uuidv4();
      console.log("initialized new server: " + req.session.serverId);
    }
  }
  res.sendFile(path.join(__dirname, "./public", "index.html"));
});

app.use("/public", express.static("public"));

app.all("/:serverId*", (req, res) => {
  const serverId = req.params.serverId;
  if (!(serverId in socketMap)) return;
  const connection = socketMap[serverId];
  const requestKey = ++connection.lastRequestKey;
  connection.responseMap[requestKey] = res;
  let directUrl = req.url.substring(serverId.length + 1);
  if (directUrl == "") {
    directUrl = "/";
  }
  const requestData: RequestData = {
    serverId: serverId,
    requestKey: requestKey,
    method: req.method,
    url: req.url,
    directUrl: directUrl,
    headers: req.headers,
    params: req.params,
    body: req.body,
    ip: req.ip,
    protocol: req.protocol,
    status: "Open",
    date: new Date(),
  };
  connection.websockets.forEach((ws) => ws.send(JSON.stringify(requestData)));

  req.on("close", () => {
    if (req.aborted) {
      requestData.status = "Closed";
      connection.websockets.forEach((ws) =>
        ws.send(JSON.stringify(requestData))
      );
    }
  });
});

server.listen(PORT, function () {
  console.log(`App listening on port ${PORT}!`);
});
