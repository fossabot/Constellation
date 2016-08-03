'use strict';

const EventEmitter = require('events').EventEmitter;
const Socket = require('./socket');
const Subscriptions = require('./subscriptions');

module.exports = class Client extends EventEmitter {
	constructor(opts) {
		super();

		this.opts = opts || {};
		this.subscriptions = new Subscriptions();
		this.setMaxListeners(0);

		if (this.opts.autoConnect || this.opts.autoConnect === undefined) {
			this.connect();
		}

		this.on('removeListener', this.unsubscribeEvent.bind(this));
		this.on('newListener', this.subscribeEvent.bind(this));
	}

	connect() {
		if (this.socket && this.socket.isConnected()) {
			this.socket.socket.close();
		}

		this.socket = new Socket(this.opts.serverAddress, this.opts.cookie, this.opts.authorization);

		const ws = this.socket.connect();
		ws.on('message', message => {
			this.messageHandler(JSON.parse(message));
		});
		ws.on('close', () => {
			this.emit('disconnected');
			if (this.opts.autoReconnect || this.opts.autoReconnect === undefined) {
				setTimeout(() => {
					this.emit('reconnecting');
					this.connect();
				}, this.opts.reconnectTime || 8000);
			}
		});
	}

	messageHandler(message) {
		if (message.type === 'event') {
			if (message.event === 'hello') {
				this.emit('connected', message.data);
				this.subscribeAllEvents();
			}
			if (message.event === 'live') {
				this.emit(message.data.channel, message.data.payload);
			}
		}
	}

	send(method, params) {
		return this.socket.sendMethod(method, params);
	}

	subscribeAllEvents() {
		const events = this.subscriptions.getSubscriptions();
		this.socket.sendMethod('livesubscribe', { events }).catch(err => {
			this.emit('error', err);
		});
	}

	subscribeEvent(event) {
		if (['connected', 'reconnecting', 'disconnected', 'error'].indexOf(event) === -1) {
			let name = event;
			if (/^chat\:[0-9]+\:(Start|Stop)Streaming$/i.test(name)) {
				name = 'channel:' + name.split(':')[1] + ':update';
			}
			this.subscriptions.addSubscription(name);
			this.socket.sendMethod('livesubscribe', { events: [name] })
				.catch(this.handleSubError.bind(this));
		}
	}

	unsubscribeEvent(event) {
		this.subscriptions.removeSubscription(event);
		this.socket.sendMethod('liveunsubscribe', { events: [event] })
			.catch(this.handleSubError.bind(this));
	}

	handleSubError(err) {
		if (err.message !== 'Not connected to Constellation.') {
			this.emit('error', err);
		}
	}
};
