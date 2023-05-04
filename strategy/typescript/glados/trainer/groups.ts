import { FriendlyRobot } from "base/robot";

import { MessageBox, MessageType } from "glados/control/messaging";
import { CenterBack } from "glados/group/centerback";
import { Dummy } from "glados/group/dummy";
import { FeintPass } from "glados/group/feintpass";
import { Moves } from "glados/group/moves";
import { Support } from "glados/group/support";

export interface Group {
	readonly name: string;
	run(messaging: MessageBox, messages: Map<FriendlyRobot, unknown>): void;
}

export type GroupConstructor = new() => Group;

type GroupPayload<G extends Group> = ValueType<Parameters<G["run"]>[1]>;

type SingleApplication<G extends Group> = G extends any
	? GroupPayload<G> extends undefined
		? { name: G["name"]; payload?: undefined }
		: { name: G["name"]; payload: GroupPayload<G> }
	: never;

export type Application = SingleApplication<CenterBack | Moves | Support | Dummy | FeintPass>;

export class Groups {
	_groupList: Group[];

	_messaging: MessageBox;

	constructor(messaging: MessageBox) {
		const groupClasses: GroupConstructor[] = [
			CenterBack,
			Moves,
			Support,
			Dummy,
			FeintPass
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

		// groupname -> { robot -> payload }
		let robotApplications: { [groupName: string]: Map<FriendlyRobot, unknown> } = {};

		for (let group of this._groupList) {
			robotApplications[group.name] = new Map<FriendlyRobot, unknown>();
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
