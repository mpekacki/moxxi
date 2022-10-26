const micromatch = require("micromatch");

const TimeAgo = require("javascript-time-ago");
const en = require("javascript-time-ago/locale/en.json");

TimeAgo.addDefaultLocale(en);

const timeAgo = new TimeAgo("en-US");

const statusCodes = {
  100: "100 Continue",
  101: "101 Switching Protocols",
  102: "102 Processing",
  200: "200 OK",
  201: "201 Created",
  202: "202 Accepted",
  203: "203 Non-authoritative Information",
  204: "204 No Content",
  205: "205 Reset Content",
  206: "206 Partial Content",
  207: "207 Multi-Status",
  208: "208 Already Reported",
  226: "226 IM Used",
  300: "300 Multiple Choices",
  301: "301 Moved Permanently",
  302: "302 Found",
  303: "303 See Other",
  304: "304 Not Modified",
  305: "305 Use Proxy",
  307: "307 Temporary Redirect",
  308: "308 Permanent Redirect",
  400: "400 Bad Request",
  401: "401 Unauthorized",
  402: "402 Payment Required",
  403: "403 Forbidden",
  404: "404 Not Found",
  405: "405 Method Not Allowed",
  406: "406 Not Acceptable",
  407: "407 Proxy Authentication Required",
  408: "408 Request Timeout",
  409: "409 Conflict",
  410: "410 Gone",
  411: "411 Length Required",
  412: "412 Precondition Failed",
  413: "413 Payload Too Large",
  414: "414 Request-URI Too Long",
  415: "415 Unsupported Media Type",
  416: "416 Requested Range Not Satisfiable",
  417: "417 Expectation Failed",
  418: "418 I'm a teapot",
  421: "421 Misdirected Request",
  422: "422 Unprocessable Entity",
  423: "423 Locked",
  424: "424 Failed Dependency",
  426: "426 Upgrade Required",
  428: "428 Precondition Required",
  429: "429 Too Many Requests",
  431: "431 Request Header Fields Too Large",
  444: "444 Connection Closed Without Response",
  451: "451 Unavailable For Legal Reasons",
  499: "499 Client Closed Request",
  500: "500 Internal Server Error",
  501: "501 Not Implemented",
  502: "502 Bad Gateway",
  503: "503 Service Unavailable",
  504: "504 Gateway Timeout",
  505: "505 HTTP Version Not Supported",
  506: "506 Variant Also Negotiates",
  507: "507 Insufficient Storage",
  508: "508 Loop Detected",
  510: "510 Not Extended",
  511: "511 Network Authentication Required",
  599: "599 Network Connect Timeout Error",
};

const app = new Vue({
  el: "#app",
  data: function () {
    return {
      serverId: "",
      serverUrl: "",
      responseBodyAllowed: false,
      requests: [],
      statusCodes: statusCodes,
      savedResponses: this.readResponsesFromStorage() || [
        this.createResponseProxy({
          id: 0,
          name: "200 {}",
          statusCode: 200,
          urlPattern: "",
          json: "{}",
        }),
        this.createResponseProxy({
          id: 1,
          name: "404 {}",
          statusCode: 404,
          urlPattern: "",
          json: "{}",
        }),
      ],
      selectedResponseId: 0,
      blinked: true,
      responseEditorVisible: false,
      wsStatus: "DISCONNECTED",
      theme: localStorage.getItem("theme") || "sakura-vader",
      themes: {
        "sakura-dark": {
          name: "sakura-dark",
          label: "Sakura Dark",
          stylesheets: ["https://unpkg.com/sakura.css/css/sakura-dark.css"],
        },
        sakura: {
          name: "sakura",
          label: "Sakura Light",
          stylesheets: ["https://unpkg.com/sakura.css/css/sakura.css"],
        },
        "sakura-dark-solarized": {
          name: "sakura-dark-solarized",
          label: "Sakura Dark Solarized",
          stylesheets: [
            "https://unpkg.com/sakura.css/css/sakura-dark-solarized.css",
          ],
        },
        "sakura-earthly": {
          name: "sakura-earthly",
          label: "Sakura Earthly",
          stylesheets: ["https://unpkg.com/sakura.css/css/sakura-earthly.css"],
        },
        "sakura-ink": {
          name: "sakura-ink",
          label: "Sakura Ink",
          stylesheets: ["https://unpkg.com/sakura.css/css/sakura-ink.css"],
        },
        "sakura-vader": {
          name: "sakura-vader",
          label: "Sakura Vader",
          stylesheets: ["https://unpkg.com/sakura.css/css/sakura-vader.css"],
        },
        water: {
          name: "water",
          label: "Water",
          stylesheets: [
            "https://cdn.jsdelivr.net/npm/water.css@2/out/water.css",
          ],
        },
        "water-dark": {
          name: "water-dark",
          label: "Water Dark",
          stylesheets: [
            "https://cdn.jsdelivr.net/npm/water.css@2/out/dark.css",
          ],
        },
        "water-light": {
          name: "water-light",
          label: "Water Light",
          stylesheets: [
            "https://cdn.jsdelivr.net/npm/water.css@2/out/light.css",
          ],
        },
        tufte: {
          name: "tufte",
          label: "Tufte",
          stylesheets: [
            "https://cdnjs.cloudflare.com/ajax/libs/tufte-css/1.7.2/tufte.min.css",
          ],
        },
        milligram: {
          name: "milligram",
          label: "Milligram",
          stylesheets: [
            "https://fonts.googleapis.com/css?family=Roboto:300,300italic,700,700italic",
            "https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.css",
            "https://cdnjs.cloudflare.com/ajax/libs/milligram/1.4.1/milligram.css",
          ],
        },
        mvp: {
          name: "mvp",
          label: "MVP",
          stylesheets: ["https://unpkg.com/mvp.css"],
        },
        picnic: {
          name: "picnic",
          label: "Picnic",
          stylesheets: [
            "https://cdn.jsdelivr.net/npm/picnic@6.5.3/picnic.min.css",
          ],
        },
        "new-css": {
          name: "new-css",
          label: "new.css",
          stylesheets: [
            "https://cdn.jsdelivr.net/npm/@exampledev/new.css@1/new.min.css",
          ],
        },
        "awsm-css": {
          name: "awsm-css",
          label: "awsm.css",
          stylesheets: ["https://unpkg.com/awsm.css/dist/awsm.min.css"],
        },
        marx: {
          name: "marx",
          label: "Marx",
          stylesheets: ["https://unpkg.com/marx-css/css/marx.min.css"],
        },
        wing: {
          name: "wing",
          label: "Wing",
          stylesheets: ["https://unpkg.com/wingcss"],
        },
        _98: {
          name: "_98",
          label: "98.css",
          stylesheets: ["https://unpkg.com/98.css"],
        },
      },
    };
  },
  computed: {
    awaitingRequests: function () {
      return this.requests.filter((r) => r.status === "Open");
    },
    completedRequests: function () {
      return this.requests.filter((r) => r.status !== "Open");
    },
    biggestResponseId: function () {
      return (
        this.savedResponses.reduce(
          (accumulator, currentValue) =>
            currentValue.id > accumulator ? currentValue.id : accumulator,
          0
        ) || 0
      );
    },
    themeStylesheets: function () {
      return this.themes[this.theme].stylesheets;
    },
  },
  created() {
    setInterval(() => {
      this.blink();
    }, 500);
    setInterval(() => {
      this.refreshTimesAgo();
    }, 10000);
  },
  watch: {
    theme: function (newVal) {
      this.theme = newVal;
      localStorage.setItem("theme", newVal);
    },
  },
  methods: {
    sendResponse: function (request) {
      ws.send(
        JSON.stringify({
          requestKey: request.requestKey,
          statusCode: request.responseStatusCode,
          json: request.responseJson,
        })
      );
      request.status = "ResponseSent";
      this.saveResponse(request.responseStatusCode, request.responseJson);
    },
    setSavedResponse: function (request, selectedResponseId) {
      const found = this.savedResponses.find((r) => r.id == selectedResponseId);
      if (found) {
        request.responseStatusCode = found.statusCode;
        request.responseJson = found.json;
      }
      return found;
    },
    sendSavedResponse: function (request, selectedResponseId) {
      this.setSavedResponse(request, selectedResponseId) &&
        this.sendResponse(request);
    },
    saveResponse: function (statusCode, json) {
      try {
        json = JSON.stringify(JSON.parse(json));
      } catch {}
      if (
        this.savedResponses.some(
          (r) => r.statusCode == statusCode && r.json == json
        )
      ) {
        return;
      }
      const newResp = {
        id: ++this.biggestResponseId,
        statusCode: statusCode,
        json: json,
        name: this.createResponseName(statusCode, json),
        urlPattern: "",
      };
      this.savedResponses.push(newResp);
      this.saveStorage();
    },
    createResponseName: function (statusCode, json) {
      return statusCode + " " + json.substring(0, 50);
    },
    newBlankResponse: function () {
      const id = ++this.biggestResponseId;
      const newResp = this.createResponseProxy({
        id: id,
        statusCode: 200,
        json: "{}",
        name: "Response " + id,
        urlPattern: "",
      });
      this.savedResponses.push(newResp);
      this.saveStorage();
      this.selectedResponseId = id;
    },
    blink: function () {
      this.blinked = !this.blinked;
    },
    refreshTimesAgo: function () {
      this.requests.map((request) => {
        request.timeAgo = timeAgo.format(new Date(request.date));
      });
    },
    toggleResponseEditor: function () {
      this.responseEditorVisible = !this.responseEditorVisible;
    },
    readResponsesFromStorage: function () {
      const fromStorage = localStorage.getItem("savedResponses");
      return fromStorage
        ? JSON.parse(fromStorage).map((x) => this.createResponseProxy(x))
        : null;
    },
    saveStorage: function () {
      localStorage.setItem(
        "savedResponses",
        JSON.stringify(this.savedResponses)
      );
    },
    createResponseProxy: function (response) {
      const that = this;
      return new Proxy(response, {
        set: function (obj, prop, value) {
          console.log(obj, prop, value);
          if (prop === "statusCode" || prop === "json") {
            const oldComputedName = that.createResponseName(
              obj.statusCode,
              obj.json
            );
            console.log("oldComputedNAme", oldComputedName);
            if (
              obj.name === oldComputedName ||
              obj.name === "Response " + obj.id ||
              obj.name === ""
            ) {
              obj.name = that.createResponseName(
                prop === "statusCode" ? value : obj.statusCode,
                prop === "json" ? value : obj.json
              );
            }
          }
          obj[prop] = value;
          that.saveStorage();
          return true;
        },
      });
    },
  },
  template: `
    <div>
        <header class="header">
            <div>
                <label>Your unique endpoint is</label><input v-model="serverUrl" readonly="true"
                    onClick="this.select();" style="width: 100%" size="85" />
            </div>
            <div>
                WebSocket status: {{ wsStatus }}
            </div>
            <div>
                Theme
                <select v-model="theme">
                    <option v-for="theme in themes" v-bind:value="theme.name">{{ theme.label }}</option>
                </select>
            </div>
        </header>
        <hr>
        <div class="app-content">
            <div class="all-requests">
                <div class="request-group">
                    <h4>Awaiting requests</h4>
                    <div v-if="!awaitingRequests.length">requests made to your endpoint will appear here</div>
                    <div class="requests">
                        <div v-for="request in awaitingRequests" class="req">
                            <hr>
                            <div v-bind:class="{ blink: blinked, offblink: !blinked }">
                                <table>
                                    <tr>
                                        <th colspan="2">Request</th>
                                    </tr>
                                    <tr>
                                        <td>date</td>
                                        <td>{{ request.date }}</td>
                                    </tr>
                                    <tr>
                                        <td>url</td>
                                        <td class="url">{{ request.directUrl }}</td>
                                    </tr>
                                    <tr>
                                        <td>method</td>
                                        <td>{{ request.method }}</td>
                                    </tr>
                                    <tr>
                                        <td>headers</td>
                                        <td>
                                            <textarea readonly="true" v-model="request.headers" rows="3"></textarea>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>body</td>
                                        <td>
                                            <textarea readonly="true" v-model="request.body" rows="3"></textarea>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>protocol</td>
                                        <td>{{ request.protocol }}</td>
                                    </tr>
                                    <tr>
                                        <th colspan="2">Response</th>
                                    </tr>
                                    <tr>
                                        <td>
                                            saved responses
                                        </td>
                                        <td class="quick-responses">
                                            <button v-for="response in savedResponses" v-on:click="sendSavedResponse(request, response.id)">
                                                {{ response.name }}
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>response status code</td>
                                        <td>
                                            <select v-model="request.responseStatusCode">
                                                <option v-for="(label, statusCode) in statusCodes" v-bind:value="statusCode">
                                                  {{ label }}
                                                </option>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>response body</td>
                                        <td>
                                            <textarea v-if="responseBodyAllowed" v-model="request.responseJson"></textarea>
                                            <p v-if="!responseBodyAllowed">disabled - can be enabled in self-hosted version!</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td v-if="request.status === 'ResponseSent'" class="text-success">response sent!
                                        </td>
                                        <td v-else-if="request.status === 'Closed'">request closed by sender</td>
                                        <td v-else>
                                            <button @click="sendResponse(request)">send response</button>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="request-group">
                    <h4>Completed requests</h4>
                    <div v-if="!completedRequests.length">(empty)</div>
                    <div class="requests">
                        <div v-for="request in completedRequests" class="req">
                            <hr>
                            <table class="table">
                                <tr>
                                    <th colspan="2">Request</th>
                                </tr>
                                <tr>
                                    <td>date</td>
                                    <td>{{ request.date }}<br/>{{ request.timeAgo }}</td>
                                </tr>
                                <tr>
                                    <td>url</td>
                                    <td class="url">{{ request.directUrl }}</td>
                                </tr>
                                <tr>
                                    <td>method</td>
                                    <td>{{ request.method }}</td>
                                </tr>
                                <tr>
                                    <td>headers</td>
                                    <td>
                                        <textarea readonly="true" v-model="request.headers" rows="2"></textarea>
                                    </td>
                                </tr>
                                <tr>
                                    <td>body</td>
                                    <td>
                                        <textarea readonly="true" v-model="request.body" rows="2"></textarea>
                                    </td>
                                </tr>
                                <tr>
                                    <td>protocol</td>
                                    <td>{{ request.protocol }}</td>
                                </tr>
                                <tbody v-if="request.status === 'ResponseSent'">
                                    <tr>
                                        <th colspan="2">Response</th>
                                    </tr>
                                    <tr>
                                        <td>response status code</td>
                                        <td>{{ request.responseStatusCode }}</td>
                                    </tr>
                                    <tr>
                                        <td>response body</td>
                                        <td>
                                            <textarea readonly="true" v-model="request.responseJson" rows="2"></textarea>
                                        </td>
                                    </tr>
                                </tbody>
                                <tr>
                                    <td></td>
                                    <td v-if="request.status === 'ResponseSent'" class="text-success">response sent!
                                        <span v-if="request.autoResponseName"> (automatic: {{ request.autoResponseName }})</span>
                                    </td>
                                    <td v-else-if="request.status === 'Closed'">request closed by sender</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div class="response-editor-wrapper">
                <button class="toggle-editor-btn" @click="toggleResponseEditor()">Response editor</button>
                <response-editor v-if="responseEditorVisible" v-bind:saved-responses="savedResponses"
                    v-bind:selected-response-id="selectedResponseId" v-bind:response-body-allowed="responseBodyAllowed"
                    v-bind:status-codes="statusCodes" v-on:newresponse="newBlankResponse()">
                </response-editor>
            </div>
        </div>
        <link v-for="url in themeStylesheets" v-bind:href="url" rel="stylesheet" type="text/css" />
    </div>
    `,
});

Vue.component("response-editor", {
  data: function () {
    return {
      responses: this.savedResponses,
      selectedRespId: this.selectedResponseId,
    };
  },
  computed: {
    selectedResponse: function () {
      return this.responses
        ? this.responses.find((r) => r.id === this.selectedRespId)
        : {};
    },
  },
  watch: {
    selectedResponseId: function (newVal) {
      this.selectedRespId = newVal;
    },
    selectedResponses: function (newVal) {
      this.responses = newVal;
    },
  },
  props: ["savedResponses", "selectedResponseId", "responseBodyAllowed", "statusCodes"],
  template: `
        <form class="form">
            <div class="form-control" style="flex: 1 100%">
                <label>
                    saved response
                </label>
                    <select v-model="selectedRespId">
                        <option v-for="response in responses" v-bind:value="response.id">{{ response.name }}</option>
                    </select>
                    <button v-on:click="$emit('newresponse'); $event.preventDefault();">New</button>
            </div>
            <div class="form-control" v-if="selectedResponse">
                <label>
                    name
                </label>
                    <input v-model="selectedResponse.name"></input>
            </div>
            <div class="form-control" v-if="selectedResponse">
                <label>
                    url pattern for auto-response
                </label>
                    <input v-model="selectedResponse.urlPattern"></input>
            </div>
            <div class="form-control">
                <label>response status code</label>
                    <select v-model="selectedResponse.statusCode">
                    <option v-for="(label, statusCode) in statusCodes" v-bind:value="statusCode">
                      {{ label }}
                    </option>
                    </select>
            </div>
            <div class="form-control">
                <label>response body</label>
                <textarea v-if="responseBodyAllowed" v-model="selectedResponse.json"></textarea>
                <p v-if="!responseBodyAllowed">disabled - can be enabled in self-hosted version!</p>
            </div>
        </form>
    `,
});

let ws = connect();

function connect() {
  let ws = new WebSocket(location.origin.replace(/^http/, "ws"));
  ws.onopen = function (event) {
    app.wsStatus = "CONNECTED";
  };
  ws.onmessage = function (event) {
    console.log(event);
    try {
      const message = JSON.parse(event.data);
      if (message.requestKey) {
        // incoming request
        const request = message;
        request.timeAgo = timeAgo.format(new Date(request.date));
        request.headers = JSON.stringify(request.headers, null, 2);
        try {
          request.body = JSON.stringify(request.body, null, 2);
        } catch {}
        let found = app.requests.find(
          (r) => r.requestKey === request.requestKey
        );
        if (found) {
          found = Object.assign(found, request);
        } else {
          request.responseStatusCode = 200;
          request.responseJson = "{}";
          app.requests.unshift(request);

          const autoResponse = app.savedResponses.find(
            (r) =>
              r.urlPattern !== "" &&
              micromatch.isMatch(request.directUrl, r.urlPattern)
          );
          if (autoResponse) {
            request.responseStatusCode = autoResponse.statusCode;
            request.responseJson = autoResponse.json;
            request.autoResponseName = autoResponse.name;
            app.sendResponse(request);
          }
        }
      } else if (message.serverId) {
        // WS initialization
        app.serverId = message.serverId;
        app.serverUrl = location.origin + "/" + message.serverId;
        app.responseBodyAllowed = message.responseBodyAllowed;
      }
    } catch (error) {
      console.error(error);
    }
  };
  ws.onclose = function (event) {
    app.wsStatus = "DISCONNECTED";
    console.log("ws closed", event);
  };
  return ws;
}

setInterval(() => {
  if (ws.readyState === WebSocket.CLOSED) {
    app.wsStatus = "RECONNECTING";
    console.log("WebSocket closed, reconnecting...");
    ws = connect();
  }
}, 10000);
