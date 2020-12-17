import { FriendlyRobot } from "base/robot";

import { MessageBox, MessageType } from "glados/control/messaging";
import { CenterBack } from "glados/group/centerback";
import { Midfield } from "glados/group/midfield";
import { Moves } from "glados/group/moves";
import { Striker } from "glados/group/striker";

type GroupName = "centerback" | "moves" | "striker" | "midfield";

export interface Group {
	readonly name: GroupName;
	run(messaging: MessageBox, messages: Map<FriendlyRobot, any>): void;
}

export type GroupConstructor = new() => Group;

export interface Application {
	name: GroupName;
	payload: any;
}

export class Groups {
	_groupList: Group[];

	_messaging: MessageBox;

	constructor(messaging: MessageBox) {
		const groupClasses: GroupConstructor[] = [
			CenterBack,
			Moves,
			Striker,
			Midfield
		];

		this._groupList = [];
		for (const group of groupClasses) {
			this._groupList.push(new group());
		}

		this._messaging = messaging;
	}

	setGroups(groupList: Group[]) {
		this._groupList = groupList;
	}

	_runGroups() {
		// robot -> { groupname -> application }
		let groupApplications = this._messaging.receiveRepeated(MessageType.groupApplication);

		// groupname -> { robot -> application }
		let robotApplications: {[groupName: string]: Map<FriendlyRobot, Application>} = {};

		for (let group of this._groupList) {
			robotApplications[group.name] = new Map<FriendlyRobot, Application>();
		}
		for (let [robot, msg] of groupApplications.entries()) {
			for (let app of msg) {
				let application = robotApplications[app.name];
				if (application == undefined) {
					throw new Error(`No group with name '${app.name}' found`);
				}
				application.set(robot, app.payload);
			}
		}

		for (let group of this._groupList) {
			let messages = robotApplications[group.name];

			group.run(this._messaging, messages);
		}
	}
}
