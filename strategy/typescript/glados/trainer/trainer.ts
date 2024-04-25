import * as debug from "base/debug";

import { dumpMessages, MessageBox, MessageType, MESSAGE_TYPE_LIST, Messaging } from "glados/control/messaging";
import { Groups, Group } from "glados/trainer/groups";
import { Roles } from "glados/trainer/roles";

export class Trainer {
	public messaging: MessageBox;
	public allMessaging: Messaging;

	private _groups: Groups;
	private _roles: Roles;

	public constructor() {
		this.allMessaging = new Messaging();
		this.messaging = this.allMessaging.registerTrainer();

		this._groups = new Groups(this.messaging);
		this._roles = new Roles(this.messaging);
	}

	public setGroups(groupList: Group[]) {
		this._groups.setGroups(groupList);
	}

	private _debugInbox(str: string) {
		debug.pushtop(str);
		for (const type of MESSAGE_TYPE_LIST) {
			dumpMessages(type, this.messaging.receiveGeneric(type));
		}
		debug.pop(); // Trainer Inbox
	}

	public run() {
		this._debugInbox("Trainer Inbox");
		this._roles._chooseExclusiveRoles();
		this._groups._runGroups();
	}
}
