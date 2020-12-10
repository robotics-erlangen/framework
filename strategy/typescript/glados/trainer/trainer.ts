import * as debug from "base/debug";

import { dumpMessages, MessageBox, MessageType, MessageTypeList, Messaging } from "glados/control/messaging";
import { Groups } from "glados/trainer/groups";
import { Roles } from "glados/trainer/roles";

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

	_debugInbox(str: string) {
		debug.pushtop(str);
		for (const type of MessageTypeList) {
			dumpMessages(MessageType[type], this._messaging.receiveGeneric(type));
		}
		debug.pop(); // Trainer Inbox
	}

	run() {
		this._debugInbox("Trainer Inbox");
		this._roles._chooseExclusiveRoles();
		this._groups._runGroups();
	}
}
