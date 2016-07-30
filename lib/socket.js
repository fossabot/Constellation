'use strict';

const Promise = require('bluebird');
const WebSocket = require('ws');

module.exports = class Socket {
	constructor(serverAddress, cookie, auth) {
		this.serverAddress = serverAddress || 'wss://constellation.beam.pro';
		this.cookie = cookie;
		this.auth = auth;
		this.id = 0;
		this.handlers = {};
	}

	connect() {
		const headers = { 'x-is-bot': true };
		if (this.cookie) {
			headers.cookie = this.cookie;
		}
		if (this.auth) {
			headers.authorization = this.auth;
		}
		this.socket = new WebSocket(this.serverAddress, { headers });
		this.socket.on('message', this.messageHandler.bind(this));
		return this.socket;
	}

	isConnected() {
		return this.socket.readyState === WebSocket.OPEN;
	}

	sendMessage(message) {
		if (!this.isConnected()) {
			throw new Error('Not connected to Constellation.');
		}
		const data = message;
		data.id = this.getMessageId();
		this.socket.send(JSON.stringify(data));
		return data.id;
	}

	sendMethod(method, params) {
		return new Promise((resolve, reject) => {
			const id = this.sendMessage({ type: 'method', method, params });
			this.handlers[id] = reply => {
				if (reply.error) {
					reject(reply.error);
				} else {
					resolve(reply.result);
				}
			};
		});
	}

	messageHandler(message) {
		const data = JSON.parse(message);
		if (data.type === 'reply') {
			const id = data.id;
			const handler = this.handlers[id];
			if (handler !== undefined) {
				delete this.handlers[id];
				handler(data);
			}
		}
	}

	getMessageId() {
		this.id++;
		if (this.id > 0xFFFFFFFF) {
			this.id = 1;
		}
		return this.id;
	}
};
