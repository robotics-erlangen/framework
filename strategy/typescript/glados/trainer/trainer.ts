/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

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
		this._roles.chooseExclusiveRoles();
		this._groups.runGroups();
	}
}
