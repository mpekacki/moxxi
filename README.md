# moxxi-mocks

Simple interactive HTTP response mocker, useful for testing API callouts. It can be used to check how your application behaves when the requests that it makes to external API endpoints return different responses, or what happens if these responses take longer time than usual to process, or when they time out altogether.
[Live demo](https://moxx-i.herokuapp.com/)
Note that setting response body is disabled in the live demo for security reasons.

## Usage
When you open the app in the browser, you get a unique enpoint URL. The URL is stored in your session cookie and is permanent as long as the cookie exists.
When you (or your app) makes a request to your unique endpoint, the request appears in the web app. You can then choose what status code and response body to send (response body is only available in self-hosted versions).
Each different response is saved (only in your browser storage) and you can quickly send it again for subsequent requests.
You can also configure auto-response for a specific URL pattern in the response editor.

## Running Locally

```sh
$ npm install
$ npm run build
$ npm start
```

The app should now be running on [localhost:5000](http://localhost:5000/).

## Deploying to Heroku

```
$ heroku create
$ git push heroku main
$ heroku open
```
or

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

Note that Heroku as a platform has a [global limit of 30 seconds per request](https://devcenter.heroku.com/articles/request-timeout).

## Configuring
If you provide two environment variables `KEY0` and `KEY1`, they will be used as session keys, which will enable your sessions (which contain endpoint URL) to survive when the app is restarted. If they are not provided, the keys are chosen randomly on app startup, so sessions created before the restart will be lost.
By default, the ability to send response body is disabled. You can enable it by setting environment variable `ALLOW_BODY` with a truthy value.