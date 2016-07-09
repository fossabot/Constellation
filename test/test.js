'use strict';

const expect = require('chai').expect;
const WebSocketServer = require('ws').Server;
const Constellation = require('../');
const Subscriptions = require('../lib/subscriptions');
const Socket = require('../lib/socket');

describe('Constellation library', () => {
	const wss = new WebSocketServer({ port: 3030 });
	let constellation;
	beforeEach(() => {
		constellation = new Constellation({
			serverAddress: 'ws://127.0.0.1:3030',
			autoReconnect: false,
		});
	});

	it('subscribes to events registered before connection', done => {
		wss.once('connection', con => {
			con.send(JSON.stringify({ type: 'event', event: 'hello', data: { authenticated: false } }));
			con.on('message', message => {
				expect(JSON.parse(message)).to.deep.equal({
					type: 'method',
					method: 'livesubscribe',
					params: {
						events: ['user:1:update', 'channel:1:update'],
					},
					id: 1,
				});
				done();
			});
		});
		constellation.on('user:1:update', () => {});
		constellation.on('channel:1:update', () => {});
	});

	it('subscribes to events registered during connection', done => {
		wss.once('connection', con => {
			con.send(JSON.stringify({ type: 'event', event: 'hello', data: { authenticated: false } }));
			con.once('message', message => {
				expect(JSON.parse(message)).to.deep.equal({
					type: 'method',
					method: 'livesubscribe',
					params: {
						events: ['user:1:update'],
					},
					id: 1,
				});
				done();
			});
		});
		constellation.on('connected', () => {
			constellation.on('user:1:update', () => {});
			constellation.on('channel:1:update', () => {});
		});
	});

	it('starts listening for event data', done => {
		wss.once('connection', con => {
			con.send(JSON.stringify({ type: 'event', event: 'hello', data: { authenticated: false } }));
			con.once('message', () => {
				con.send(JSON.stringify({
					type: 'event',
					event: 'live',
					data: {
						channel: 'user:1:update',
						payload: {
							sparks: 10000,
						},
					},
				}));
			});
		});
		constellation.on('connected', () => {
			constellation.on('user:1:update', message => {
				expect(message).to.deep.equal({ sparks: 10000 });
				done();
			});
		});
	});

	it('stops listening for event data', done => {
		wss.once('connection', con => {
			con.send(JSON.stringify({ type: 'event', event: 'hello', data: { authenticated: false } }));
			con.once('message', () => {
				con.once('message', message => {
					expect(JSON.parse(message)).to.deep.equal({
						type: 'method',
						method: 'liveunsubscribe',
						params: {
							events: ['user:1:update'],
						},
						id: 2,
					});
					done();
				});
			});
		});
		constellation.on('connected', () => {
			constellation.on('user:1:update', () => {});
			constellation.removeAllListeners('user:1:update');
			expect(constellation.subscriptions.getSubscriptions()).to.have.length(0);
		});
	});

	it('fails to listen for event data before connection', done => {
		const error = {
			code: 4100,
			message: 'Unknown event \'my silly event\'',
		};
		wss.once('connection', con => {
			con.send(JSON.stringify({ type: 'event', event: 'hello', data: { authenticated: false } }));
			con.once('message', () => {
				con.send(JSON.stringify({ type: 'reply', result: null, error, id: 1 }));
			});
		});
		constellation.once('error', err => {
			expect(err).to.deep.equal(error);
			done();
		});
		constellation.on('user:1:update', () => {});
	});

	it('fails to listen for event data during connection', done => {
		const error = {
			code: 4100,
			message: 'Unknown event \'my silly event\'',
		};
		wss.once('connection', con => {
			con.send(JSON.stringify({ type: 'event', event: 'hello', data: { authenticated: false } }));
			con.once('message', () => {
				con.send(JSON.stringify({ type: 'reply', result: null, error, id: 1 }));
			});
		});
		constellation.on('connected', () => {
			constellation.once('error', err => {
				expect(err).to.deep.equal(error);
				done();
			});
			constellation.on('user:1:update', () => {});
		});
	});

	it('sends a method with successful reply', done => {
		wss.once('connection', con => {
			con.send(JSON.stringify({ type: 'event', event: 'hello', data: { authenticated: false } }));
			con.once('message', () => {
				con.send(JSON.stringify({ type: 'reply', result: 4, error: null, id: 1 }));
			});
		});
		constellation.on('connected', () => {
			constellation.send('divide', { numerator: 16, denominator: 4 }).then(message => {
				expect(message).to.equal(4);
				done();
			});
		});
	});

	it('sends a method with errorful reply', done => {
		wss.once('connection', con => {
			con.send(JSON.stringify({ type: 'event', event: 'hello', data: { authenticated: false } }));
			con.once('message', () => {
				con.send(JSON.stringify({
					type: 'reply',
					result: null,
					error: {
						code: 1000,
						message: 'Cannot divide by zero',
					},
					id: 1,
				}));
			});
		});
		constellation.on('connected', () => {
			constellation.send('divide', { numerator: 16, denominator: 4 }).catch(message => {
				expect(message).to.deep.equal({ code: 1000, message: 'Cannot divide by zero' });
				done();
			});
		});
	});

	it('reconnects on disconnection', done => {
		wss.once('connection', con => {
			con.send(JSON.stringify({ type: 'event', event: 'hello', data: { authenticated: false } }));
		});
		constellation.opts.autoReconnect = true;
		constellation.opts.reconnectTime = 1;
		constellation.on('connected', () => {
			constellation.socket.socket.emit('close');
			wss.once('connection', () => {
				done();
			});
		});
	});

	it('prevents the identifier overflowing', () => {
		constellation.socket.id = 4294967295;
		expect(constellation.socket.getMessageId()).to.equal(1);
	});

	it('defaults server address if undefined', () => {
		const socket = new Socket();
		expect(socket.serverAddress).to.equal('wss://constellation.beam.pro');
	});

	it('does not error if an unknown message is received', () => {
		const socket = new Socket();
		socket.messageHandler(JSON.stringify({ type: 'reply', result: null, error: null, id: '?' }));
	});

	it('does not register the same event twice', () => {
		const subs = new Subscriptions();
		subs.addSubscription('event');
		subs.addSubscription('event');
		expect(subs.subscriptions).to.have.length(1);
	});
});
