import * as debug from "base/debug";
import {MessageBox, Messaging, MessageTypeList, MessageType} from "glados/control/messaging";
import {Groups} from "glados/trainer/groups";
import {Roles} from "glados/trainer/roles";

export class Trainer {
	_messaging: MessageBox;
	_allMessaging: Messaging;

	_groups: Groups;
	_roles: Roles;

	constructor() {
		this._allMessaging = new Messaging();
		this._messaging = this._allMessaging.registerTrainer();

		this._groups = new Groups(this._messaging);
		this._roles = new Roles(this._messaging);
	}

	_debugInbox (str?: string) {
		debug.pushtop(str || "Trainer Inbox");
		for (let type of MessageTypeList) {
			let messages = this._messaging.receiveGeneric(type);
			if (messages.size > 0) {
				debug.push(MessageType[type]);
				for (let [sender, msg] of messages.entries()) {
					debug.set(sender.id == undefined ? sender : sender.id, msg);
				}
				debug.pop(); // name
			}
		}
		debug.pop(); // Trainer Inbox
	}

	run () {
		this._debugInbox("Preliminary Trainer Inbox");
		this._roles._chooseExclusiveRoles();
		this._groups._runGroups();
		this._debugInbox();
	}
}