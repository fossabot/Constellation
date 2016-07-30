# Constellation

[![Build Status](https://travis-ci.org/StreamJar/Constellation.svg?branch=master)](https://travis-ci.org/StreamJar/Constellation) [![Coverage Status](https://coveralls.io/repos/github/StreamJar/Constellation/badge.svg?branch=master)](https://coveralls.io/github/StreamJar/Constellation?branch=master)

This is a **work in progress** client for the upcoming Beam Constellation service, which replaces the existing Beam Liveloading system.

Since Constellation itself has not yet been released (as of writing), this library is currently based on [a public specification of the protocol](https://dev.beam.pro/reference/liveloading/constellation.pdf), and it will be revised once Constellation is released for public use. Consequently, at this stage, there is no guarantee it will work correctly.

Regardless of this early stage, anticipated usage information has been included below.

## Usage

After creating a Constellation client, simply listening for an event allows you to start receiving data immediately. The library will automatically connect, subscribe to events you are listening for, and it will reconnect automatically if it loses connection.

```js
const constellation = new Constellation();
constellation.on('user:1:update', data => {
	// { "sparks": 10000 }
});
```

However, if you don't want to connect automatically, you can pass an options object, and then run `constellation.connect()` function when required.

```js
const constellation = new Constellation({ autoConnect: false });
constellation.connect();
```

If you require authentication, you can pass either `cookie` (containing a Beam session cookie) or `authorization` (containing an OAuth Bearer token).

```js
const constellation = new Constellation({ authorization: '...' });
```

You can manually send a message to the Constellation server by using `constellation.send(method, params)`. A promise is returned once the Constellation server replies. The promise is rejected if Constellation responds with an `error`, or if the client is not currently connected to Constellation.

```js
const constellation = new Constellation();
constellation.on('connected', () => {
	constellation.send('divide', { numerator: 16, denominator: 4 }).then(res => {
		// 4
	}).catch(err => {
		// { "code": 1000, "message": "Cannot divide by zero" }
	});
});
```

All possible options are:

- `autoConnect` - Whether the client should automatically connect to the server. Defaults to `true`.
- `autoReconnect` - Whether the client should automatically reconnect on disconnection. Defaults to `true`.
- `reconnectTime` - The number of milliseconds to wait before a reconnection attempt. Defaults to `8000`.
- `serverAddress` - The address that the client should connect to. Defaults to `wss://constellation.beam.pro`
- `authorization` - The OAuth Bearer token to authenticate with, if necessary.
- `cookie` - The Beam session cookie to authenticate with, if necessary.

Reserved events (that will not get passed through to Constellation when listening for them) include:

- `connected`
- `disconnected`
- `reconnecting`
- `error`