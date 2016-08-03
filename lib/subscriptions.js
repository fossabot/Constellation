'use strict';

module.exports = class Subscriptions {
	constructor() {
		this.subscriptions = [];
	}

	getSubscriptions() {
		return this.subscriptions;
	}

	addSubscription(event) {
		if (this.subscriptions.indexOf(event) === -1) {
			this.subscriptions.push(event);
		}
	}

	removeSubscription(event) {
		this.subscriptions.splice(this.subscriptions.indexOf(event), 1);
	}

	isSubscribed(event) {
		return this.subscriptions.indexOf(event) !== -1;
	}
};
