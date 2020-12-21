const micromatch = require('micromatch');

const app = new Vue({
    el: '#app',
    data: function () {
        return {
            serverId: '',
            serverUrl: '',
            requests: [],
            savedResponses: this.readResponsesFromStorage() || [
                this.createResponseProxy({
                    id: 0,
                    name: '200 {}',
                    statusCode: 200,
                    urlPattern: '',
                    json: '{}'
                }),
                this.createResponseProxy({
                    id: 1,
                    name: '404 {}',
                    statusCode: 404,
                    urlPattern: '',
                    json: '{}'
                })
            ],
            selectedResponseId: 0,
            blinked: true,
            responseEditorVisible: false,
            wsStatus: 'DISCONNECTED',
            theme: localStorage.getItem('theme') || 'sakura-vader',
            themes: {
                'sakura-dark': {
                    name: 'sakura-dark', label: 'Sakura Dark', stylesheets: [
                        'https://unpkg.com/sakura.css/css/sakura-dark.css'
                    ]
                },
                'sakura': {
                    name: 'sakura', label: 'Sakura Light', stylesheets: [
                        'https://unpkg.com/sakura.css/css/sakura.css'
                    ]
                },
                'sakura-dark-solarized': {
                    name: 'sakura-dark-solarized', label: 'Sakura Dark Solarized', stylesheets: [
                        'https://unpkg.com/sakura.css/css/sakura-dark-solarized.css'
                    ]
                },
                'sakura-earthly': {
                    name: 'sakura-earthly', label: 'Sakura Earthly', stylesheets: [
                        'https://unpkg.com/sakura.css/css/sakura-earthly.css'
                    ]
                },
                'sakura-ink': {
                    name: 'sakura-ink', label: 'Sakura Ink', stylesheets: [
                        'https://unpkg.com/sakura.css/css/sakura-ink.css'
                    ]
                },
                'sakura-vader': {
                    name: 'sakura-vader', label: 'Sakura Vader', stylesheets: [
                        'https://unpkg.com/sakura.css/css/sakura-vader.css'
                    ]
                },
                'water': {
                    name: 'water', label: 'Water', stylesheets: [
                        'https://cdn.jsdelivr.net/npm/water.css@2/out/water.css'
                    ]
                },
                'water-dark': {
                    name: 'water-dark', label: 'Water Dark', stylesheets: [
                        'https://cdn.jsdelivr.net/npm/water.css@2/out/dark.css'
                    ]
                },
                'water-light': {
                    name: 'water-light', label: 'Water Light', stylesheets: [
                        'https://cdn.jsdelivr.net/npm/water.css@2/out/light.css'
                    ]
                },
                'tufte': {
                    name: 'tufte', label: 'Tufte', stylesheets: [
                        'https://cdnjs.cloudflare.com/ajax/libs/tufte-css/1.7.2/tufte.min.css'
                    ]
                },
                'milligram': {
                    name: 'milligram', label: 'Milligram', stylesheets: [
                        'https://fonts.googleapis.com/css?family=Roboto:300,300italic,700,700italic',
                        'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.css',
                        'https://cdnjs.cloudflare.com/ajax/libs/milligram/1.4.1/milligram.css'
                    ]
                },
                'mvp': {
                    name: 'mvp', label: 'MVP', stylesheets: [
                        'https://unpkg.com/mvp.css'
                    ]
                },
                'picnic': {
                    name: 'picnic', label: 'Picnic', stylesheets: [
                        'https://cdn.jsdelivr.net/npm/picnic@6.5.3/picnic.min.css'
                    ]
                },
                'mini': {
                    name: 'mini', label: 'Mini', stylesheets: [
                        'https://gitcdn.link/repo/Chalarangelo/mini.css/master/dist/mini-default.css'
                    ]
                },
                'mini-dark': {
                    name: 'mini-dark', label: 'Mini Dark', stylesheets: [
                        'https://gitcdn.link/repo/Chalarangelo/mini.css/master/dist/mini-dark.css'
                    ]
                },
                'mini-nord': {
                    name: 'mini-nord', label: 'Mini Nord', stylesheets: [
                        'https://gitcdn.link/repo/Chalarangelo/mini.css/master/dist/mini-nord.css'
                    ]
                },
                'new-css': {
                    name: 'new-css', label: 'new.css', stylesheets: [
                        'https://cdn.jsdelivr.net/npm/@exampledev/new.css@1/new.min.css'
                    ]
                },
                'awsm-css': {
                    name: 'awsm-css', label: 'awsm.css', stylesheets: [
                        'https://unpkg.com/awsm.css/dist/awsm.min.css'
                    ]
                },
                'marx': {
                    name: 'marx', label: 'Marx', stylesheets: [
                        'https://unpkg.com/marx-css/css/marx.min.css'
                    ]
                },
                'wing': {
                    name: 'wing', label: 'Wing', stylesheets: [
                        'https://unpkg.com/wingcss'
                    ]
                }
            }
        }
    },
    computed: {
        awaitingRequests: function () {
            return this.requests.filter(r => r.status === 'Open');
        },
        completedRequests: function () {
            return this.requests.filter(r => r.status !== 'Open');
        },
        biggestResponseId: function () {
            return this.savedResponses.reduce((accumulator, currentValue) => currentValue.id > accumulator ? currentValue.id : accumulator, 0) || 0;
        },
        themeStylesheets: function () {
            return this.themes[this.theme].stylesheets;
        }
    },
    created() {
        setInterval(() => {
            this.blink();
        }, 500);
    },
    watch: {
        theme: function (newVal) {
            this.theme = newVal;
            localStorage.setItem('theme', newVal);
        }
    },
    methods: {
        sendResponse: function (request) {
            ws.send(JSON.stringify({
                requestKey: request.requestKey,
                statusCode: request.responseStatusCode,
                json: request.responseJson
            }));
            request.status = 'ResponseSent';
            this.saveResponse(request.responseStatusCode, request.responseJson);
        },
        setSavedResponse: function (request, selectedResponseId) {
            const found = this.savedResponses.find(r => r.id == selectedResponseId);
            if (found) {
                request.responseStatusCode = found.statusCode;
                request.responseJson = found.json;
            }
        },
        saveResponse: function (statusCode, json) {
            try {
                json = JSON.stringify(JSON.parse(json))
            } catch { }
            if (this.savedResponses.some(r => r.statusCode == statusCode && r.json == json)) {
                return;
            }
            const newResp = { id: ++this.biggestResponseId, statusCode: statusCode, json: json, name: this.createResponseName(statusCode, json), urlPattern: '' };
            this.savedResponses.push(newResp);
            this.saveStorage();
        },
        createResponseName: function (statusCode, json) {
            return statusCode + ' ' + json.substring(0, 50);
        },
        newBlankResponse: function () {
            const id = ++this.biggestResponseId;
            const newResp = this.createResponseProxy({ id: id, statusCode: 200, json: '{}', name: 'Response ' + id, urlPattern: '' });
            this.savedResponses.push(newResp);
            this.saveStorage();
            this.selectedResponseId = id;
            // fetch('/predefined-response', {
            //     method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(newResp)
            // }).then(r => console.log(r));
        },
        blink: function () {
            this.blinked = !this.blinked;
        },
        toggleResponseEditor: function () {
            this.responseEditorVisible = !this.responseEditorVisible;
        },
        readResponsesFromStorage: function () {
            const fromStorage = localStorage.getItem('savedResponses');
            return fromStorage ? JSON.parse(fromStorage).map(x => this.createResponseProxy(x)) : null;
        },
        saveStorage: function () {
            localStorage.setItem('savedResponses', JSON.stringify(this.savedResponses));
        },
        createResponseProxy: function (response) {
            const that = this;
            return new Proxy(response, {
                set: function (obj, prop, value) {
                    console.log(obj, prop, value);
                    if (prop === 'statusCode' || prop === 'json') {
                        const oldComputedName = that.createResponseName(obj.statusCode, obj.json);
                        console.log('oldComputedNAme', oldComputedName);
                        if (obj.name === oldComputedName || obj.name === 'Response ' + obj.id || obj.name === '') {
                            obj.name = that.createResponseName(prop === 'statusCode' ? value : obj.statusCode, prop === 'json' ? value : obj.json);
                        }
                    }
                    obj[prop] = value;
                    that.saveStorage();
                    return true;
                }
            });
        }
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
                    <div v-if="!awaitingRequests.length">(empty)</div>
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
                                            saved response
                                        </td>
                                        <td>
                                            <select v-on:change="setSavedResponse(request, $event.target.value)">
                                                <option value=""></option>
                                                <option v-for="response in savedResponses" v-bind:value="response.id">
                                                    {{ response.name }}</option>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>response status code</td>
                                        <td>
                                            <select v-model="request.responseStatusCode">
                                                <option value="100">100 Continue</option>
                                                <option value="101">101 Switching Protocols</option>
                                                <option value="102">102 Processing</option>
                                                <option value="200">200 OK</option>
                                                <option value="201">201 Created</option>
                                                <option value="202">202 Accepted</option>
                                                <option value="203">203 Non-authoritative Information</option>
                                                <option value="204">204 No Content</option>
                                                <option value="205">205 Reset Content</option>
                                                <option value="206">206 Partial Content</option>
                                                <option value="207">207 Multi-Status</option>
                                                <option value="208">208 Already Reported</option>
                                                <option value="226">226 IM Used</option>
                                                <option value="300">300 Multiple Choices</option>
                                                <option value="301">301 Moved Permanently</option>
                                                <option value="302">302 Found</option>
                                                <option value="303">303 See Other</option>
                                                <option value="304">304 Not Modified</option>
                                                <option value="305">305 Use Proxy</option>
                                                <option value="307">307 Temporary Redirect</option>
                                                <option value="308">308 Permanent Redirect</option>
                                                <option value="400">400 Bad Request</option>
                                                <option value="401">401 Unauthorized</option>
                                                <option value="402">402 Payment Required</option>
                                                <option value="403">403 Forbidden</option>
                                                <option value="404">404 Not Found</option>
                                                <option value="405">405 Method Not Allowed</option>
                                                <option value="406">406 Not Acceptable</option>
                                                <option value="407">407 Proxy Authentication Required</option>
                                                <option value="408">408 Request Timeout</option>
                                                <option value="409">409 Conflict</option>
                                                <option value="410">410 Gone</option>
                                                <option value="411">411 Length Required</option>
                                                <option value="412">412 Precondition Failed</option>
                                                <option value="413">413 Payload Too Large</option>
                                                <option value="414">414 Request-URI Too Long</option>
                                                <option value="415">415 Unsupported Media Type</option>
                                                <option value="416">416 Requested Range Not Satisfiable</option>
                                                <option value="417">417 Expectation Failed</option>
                                                <option value="418">418 I\'m a teapot</option>
                                                <option value="421">421 Misdirected Request</option>
                                                <option value="422">422 Unprocessable Entity</option>
                                                <option value="423">423 Locked</option>
                                                <option value="424">424 Failed Dependency</option>
                                                <option value="426">426 Upgrade Required</option>
                                                <option value="428">428 Precondition Required</option>
                                                <option value="429">429 Too Many Requests</option>
                                                <option value="431">431 Request Header Fields Too Large</option>
                                                <option value="444">444 Connection Closed Without Response</option>
                                                <option value="451">451 Unavailable For Legal Reasons</option>
                                                <option value="499">499 Client Closed Request</option>
                                                <option value="500">500 Internal Server Error</option>
                                                <option value="501">501 Not Implemented</option>
                                                <option value="502">502 Bad Gateway</option>
                                                <option value="503">503 Service Unavailable</option>
                                                <option value="504">504 Gateway Timeout</option>
                                                <option value="505">505 HTTP Version Not Supported</option>
                                                <option value="506">506 Variant Also Negotiates</option>
                                                <option value="507">507 Insufficient Storage</option>
                                                <option value="508">508 Loop Detected</option>
                                                <option value="510">510 Not Extended</option>
                                                <option value="511">511 Network Authentication Required</option>
                                                <option value="599">599 Network Connect Timeout Error</option>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>response json</td>
                                        <td>
                                            <textarea v-model="request.responseJson"></textarea>
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
                                        <td>response json</td>
                                        <td>{{ request.responseJson }}</td>
                                    </tr>
                                </tbody>
                                <tr>
                                    <td></td>
                                    <td v-if="request.status === 'ResponseSent'" class="text-success">response sent!
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
                    v-bind:selected-response-id="selectedResponseId" v-on:newresponse="newBlankResponse()">
                </response-editor>
            </div>
        </div>
        <link v-for="url in themeStylesheets" v-bind:href="url" rel="stylesheet" type="text/css" />
    </div>
    `
});

Vue.component('response-editor', {
    data: function () {
        return {
            responses: this.savedResponses,
            selectedRespId: this.selectedResponseId
        }
    },
    computed: {
        selectedResponse: function () {
            return this.responses ? this.responses.find(r => r.id === this.selectedRespId) : {}
        }
    },
    watch: {
        selectedResponseId: function (newVal) {
            this.selectedRespId = newVal;
        },
        selectedResponses: function (newVal) {
            this.responses = newVal;
        }
    },
    props: ['savedResponses', 'selectedResponseId'],
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
                        <option value="100">100 Continue</option>
                        <option value="101">101 Switching Protocols</option>
                        <option value="102">102 Processing</option>
                        <option value="200">200 OK</option>
                        <option value="201">201 Created</option>
                        <option value="202">202 Accepted</option>
                        <option value="203">203 Non-authoritative Information</option>
                        <option value="204">204 No Content</option>
                        <option value="205">205 Reset Content</option>
                        <option value="206">206 Partial Content</option>
                        <option value="207">207 Multi-Status</option>
                        <option value="208">208 Already Reported</option>
                        <option value="226">226 IM Used</option>
                        <option value="300">300 Multiple Choices</option>
                        <option value="301">301 Moved Permanently</option>
                        <option value="302">302 Found</option>
                        <option value="303">303 See Other</option>
                        <option value="304">304 Not Modified</option>
                        <option value="305">305 Use Proxy</option>
                        <option value="307">307 Temporary Redirect</option>
                        <option value="308">308 Permanent Redirect</option>
                        <option value="400">400 Bad Request</option>
                        <option value="401">401 Unauthorized</option>
                        <option value="402">402 Payment Required</option>
                        <option value="403">403 Forbidden</option>
                        <option value="404">404 Not Found</option>
                        <option value="405">405 Method Not Allowed</option>
                        <option value="406">406 Not Acceptable</option>
                        <option value="407">407 Proxy Authentication Required</option>
                        <option value="408">408 Request Timeout</option>
                        <option value="409">409 Conflict</option>
                        <option value="410">410 Gone</option>
                        <option value="411">411 Length Required</option>
                        <option value="412">412 Precondition Failed</option>
                        <option value="413">413 Payload Too Large</option>
                        <option value="414">414 Request-URI Too Long</option>
                        <option value="415">415 Unsupported Media Type</option>
                        <option value="416">416 Requested Range Not Satisfiable</option>
                        <option value="417">417 Expectation Failed</option>
                        <option value="418">418 I\'m a teapot</option>
                        <option value="421">421 Misdirected Request</option>
                        <option value="422">422 Unprocessable Entity</option>
                        <option value="423">423 Locked</option>
                        <option value="424">424 Failed Dependency</option>
                        <option value="426">426 Upgrade Required</option>
                        <option value="428">428 Precondition Required</option>
                        <option value="429">429 Too Many Requests</option>
                        <option value="431">431 Request Header Fields Too Large</option>
                        <option value="444">444 Connection Closed Without Response</option>
                        <option value="451">451 Unavailable For Legal Reasons</option>
                        <option value="499">499 Client Closed Request</option>
                        <option value="500">500 Internal Server Error</option>
                        <option value="501">501 Not Implemented</option>
                        <option value="502">502 Bad Gateway</option>
                        <option value="503">503 Service Unavailable</option>
                        <option value="504">504 Gateway Timeout</option>
                        <option value="505">505 HTTP Version Not Supported</option>
                        <option value="506">506 Variant Also Negotiates</option>
                        <option value="507">507 Insufficient Storage</option>
                        <option value="508">508 Loop Detected</option>
                        <option value="510">510 Not Extended</option>
                        <option value="511">511 Network Authentication Required</option>
                        <option value="599">599 Network Connect Timeout Error</option>
                    </select>
            </div>
            <div class="form-control">
                <label>response json</label>
                    <textarea v-model="selectedResponse.json"></textarea>
            </div>
        </form>
    `
});

let ws = connect();

function connect() {
    let ws = new WebSocket(location.origin.replace(/^http/, 'ws'));
    ws.onopen = function (event) {
        app.wsStatus = 'CONNECTED';
    }
    ws.onmessage = function (event) {
        console.log(event);
        try {
            const message = JSON.parse(event.data);
            if (message.requestKey) {
                const request = message;
                request.headers = JSON.stringify(request.headers, null, 2);
                try {
                    request.body = JSON.stringify(request.body, null, 2);
                } catch { }
                let found = app.requests.find(r => r.requestKey === request.requestKey);
                if (found) {
                    found = Object.assign(found, request);
                } else {
                    request.responseStatusCode = 200;
                    request.responseJson = '{}';
                    app.requests.unshift(request);

                    const autoResponse = app.savedResponses.find(r => r.urlPattern !== '' && micromatch.isMatch(request.directUrl, r.urlPattern));
                    if (autoResponse) {
                        request.responseStatusCode = autoResponse.statusCode;
                        request.responseJson = autoResponse.json;
                        app.sendResponse(request);
                    }
                }
            } else if (message.serverId) {
                app.serverId = message.serverId;
                app.serverUrl = location.origin + '/' + message.serverId;
            }
        } catch (error) {
            console.error(error);
        }
    }
    ws.onclose = function (event) {
        app.wsStatus = 'DISCONNECTED';
        console.log('ws closed', event);
    }
    return ws;
}

setInterval(() => {
    if (ws.readyState === WebSocket.CLOSED) {
        app.wsStatus = 'RECONNECTING';
        console.log('WebSocket closed, reconnecting...');
        ws = connect();
    }
}, 10000);