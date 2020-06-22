import * as debug from "base/debug";
import { FriendlyRobot, Robot } from "base/robot";
import { Position, RelativePosition } from "base/vector";

import { Point as CenterBackPoint } from "glados/group/centerback";
import { head } from "glados/util/collections";
import { LeveledRating } from "glados/util/rating";

// TODO: document the messages in a more native format
/*
local msgDefs = {
	-- ========================
	-- === multiple senders ===
	-- ========================

	-- sent by robots we don't control (mixed team challenge)
	allyFlag = "flag",

	-- sent by all attackers
	attackerFlag = "flag",

	-- sent by t/duel to make sure that the opponent duelist does not get marked as well
	defendedOpponent = Robot,

	-- sent by all defenders
	defenderFlag = "flag",

	-- sent by various tasks to notify other robots about their future positioning
	moveDest = "vector",

	-- sent by strikers to the MA to propose a possible pass
	-- requests that the ball is at msg.ballPos when the time reaches msg.time
	passSuggestion = { ballPos = "vector", time = "number", anonymous = "boolean", chip = "boolean", manual = "boolean" },

	-- sent by various behaviors which want to change the pool
	-- the string can be "attacker" or "defender"
	poolChangeRequest = "string",

	-- sent by all strikers
	strikerFlag = "flag",

	-- sent by t/striker to tell all other strikers about the currency of the sampled pass position
	strikerSamplingTimestamp = "number",


	-- =====================
	-- === single sender ===
	-- =====================

	-- sent by the MA to tell other attackers about the origin of the next shot
	attackPosition = "vector",

	-- sent by the MA to tell other attackers about the time of the next shot
	attackTime = "number",

	-- sent by gr/centerback to assign a target and a position to the centerback tasks
	-- target can be any table (preferably a ball-like or robot-like object)
	-- time is relativ time until the target should be reached
	centerBackPosTarget = { pos = "vector", target = "table", way = "number", time = "number" },

	-- sent by gr/moves to the participating agents
	-- params is a list of parameters
	moveAssignment = { behavior: "class", class = "class", params: "table", restart: "boolean", mainAttacker = "boolean" },

	-- sent by gr/moves to tr/attackratio to overwrite the number of attackers
	moveInfo = { numAttackers: "number", allowExtraAttackers: "boolean" }

	-- sent by the MA to notify all agents about an upcoming pass
	-- when the ball is actually shot, there should only be one entry in the table
	-- this is needed to choose the correct mainAttacker
	-- the ball is at msg.ballPos when the time reaches msg.time
	-- table is of entries of the format: { target = Robot, ballPos = "vector", time = "number" }
	passInfo = "table",

	-- sent by tr/defense to assign a behavior to each defender
	-- possible names are "CenterBack", "ManMark" and "ZoneDefense"
	-- params is a list of parameters
		-- Centerback:
			-- params[1]: Table, target like {pos= Vector, dir=Vector, time = number}
		-- ManMark:
			-- params[1]: Robot manMarkTarget
		-- ZoneDefense
			-- params[1]: Vector movePos
	roleAssignment = { name = "string", params: "table" },

	-- sent by the MA to tell other attackers about the destination of the next shot
	shootDestination = "vector",

	-- sent by gr/striker to assign zones to the striker tasks
	-- msg.boundaries = { left: number, right: number }
	strikerZone = { defaultPos = "vector", boundaries = "table" },

	-- sent by gr/midfield to assign zones to the midfield tasks
	-- msg.boundaries = { left: number, right: number }
	midfieldZone = { defaultPos = "vector", boundaries = "table" },
}


local exclusiveRoles = {
	mainAttacker = "number",
	duelAssistant = "number",
	interceptPass = "number",
}
for role, _ in pairs(exclusiveRoles) do
	msgDefs[role] = Robot
end


local repeatedMessages = {
	-- sent by agents that want to apply for an exclusive role
	-- the list of exclusive roles is defined below
	-- format: msg.<role>: number
	exclusiveRole = "table",

	-- sent by gr/moves to make sure that unassigned robots become defenders
	forcePoolChange = { robot = Robot, destPool = "string" },

	-- sent by agents that want to join a specific group
	-- the list of groups is defined in tr/groups
	groupApplication = { name = "string", payload = "table" },
}
*/

export enum MessageType {
	// multiple sender
	allyFlag, attackerFlag, defendedOpponent, dueledOpponent, defenderFlag,
	moveDest, passSuggestion, poolChangeRequest, strikerFlag,
	strikerSamplingTimestamp,

	// single sender
	attackPosition, plannedAttackTime, centerBackPosTarget, earliestAttackTime, moveAssignment,
	moveInfo, passInfo, roleAssignment, shootDestination,
	strikerZone, midfieldZone, placingRobot,

	// exclusive roles
	mainAttacker, duelAssistant, interceptPass, exchangeRobot,

	// repeated messages
	exclusiveRole, forcePoolChange, groupApplication
}

export type ExclusiveRole = MessageType.mainAttacker | MessageType.duelAssistant | MessageType.interceptPass | MessageType.exchangeRobot;

export const MessageTypeList = [
	MessageType.allyFlag, MessageType.attackerFlag, MessageType.defendedOpponent, MessageType.dueledOpponent, MessageType.defenderFlag,
	MessageType.moveDest, MessageType.passSuggestion, MessageType.poolChangeRequest, MessageType.strikerFlag,
	MessageType.strikerSamplingTimestamp,
	MessageType.attackPosition, MessageType.earliestAttackTime, MessageType.centerBackPosTarget, MessageType.plannedAttackTime, MessageType.moveAssignment,
	MessageType.moveInfo, MessageType.passInfo, MessageType.roleAssignment, MessageType.shootDestination,
	MessageType.strikerZone, MessageType.midfieldZone,
	MessageType.mainAttacker, MessageType.duelAssistant, MessageType.interceptPass, MessageType.exchangeRobot,
	MessageType.exclusiveRole, MessageType.forcePoolChange, MessageType.groupApplication, MessageType.placingRobot
];

type MessageOrigin = "trainer" | FriendlyRobot;

interface AgentLike {
	isAgent(): boolean;
	robot(): FriendlyRobot;
}

const emptyMap: Readonly<Map<FriendlyRobot, any>> = Object.freeze(new Map<FriendlyRobot, any>());

export class MessageBox {
	private messaging: Messaging;
	private origin: MessageOrigin;


	constructor(messaging: Messaging, origin: MessageOrigin) {
		this.messaging = messaging;
		this.origin = origin;
	}

	send(type: MessageType.centerBackPosTarget, dest: FriendlyRobot, target: CenterBackPoint): void;
	send(type: MessageType.moveAssignment, dest: FriendlyRobot, assignment: {behavior?: any, class?: any, params: any, restart: boolean, mainAttacker: boolean}): void;
	send(type: MessageType.roleAssignment, dest: FriendlyRobot, assignment: { name: "CenterBack", params: {pos: Position, dir?: RelativePosition, time?: number} }): void;
	send(type: MessageType.roleAssignment, dest: FriendlyRobot, assignment: { name: "ManMark", params: Robot[] }): void;
	send(type: MessageType.roleAssignment, dest: FriendlyRobot, assignment: { name: "ZoneDefense", params: Position[] }): void;
	send(type: MessageType.roleAssignment, dest: FriendlyRobot, assignment: { name: "Piggy", params: Robot[] }): void;
	send(type: MessageType.strikerZone, dest: FriendlyRobot, zone: { defaultPos: Position, boundaries: {left: number, right: number, top: number, bottom: number} }): void;
	send(type: MessageType.midfieldZone, dest: FriendlyRobot, zone: { defaultPos: Position, boundaries: {left: number, right: number, top: number, bottom: number} }): void;
	send(type: MessageType, dest: FriendlyRobot, data?: any): void {
		this.sendGeneric(type, dest, data, false);
	}

	sendRepeated(type: MessageType, dest: FriendlyRobot, data?: any): void {
		this.sendGeneric(type, dest, data, true);
	}

	sendToTrainer(type: MessageType.poolChangeRequest, changeTo: "attacker" | "defender"): void;
	sendToTrainer(type: MessageType.moveInfo, info: { numAttackers: number, allowExtraAttackers: boolean }): void;
	sendToTrainer(type: MessageType, data?: any): void {
		this.sendGeneric(type, "trainer", data, false);
	}

	sendToTrainerRepeated(type: MessageType.exclusiveRole, role: [ExclusiveRole, LeveledRating]): void;
	sendToTrainerRepeated(type: MessageType.forcePoolChange, info: { robot: FriendlyRobot, destPool: "manual" | "ally" | "keeper" | "defender" | "attacker" | "hidden" }): void;
	sendToTrainerRepeated(type: MessageType.groupApplication, group: { name: "centerback" | "moves" | "striker" | "midfield", payload: any }): void;
	sendToTrainerRepeated(type: MessageType, data?: any): void {
		this.sendGeneric(type, "trainer", data, true);
	}

	sendBroadcast(type: MessageType.allyFlag, data?: undefined): void;
	sendBroadcast(type: MessageType.attackerFlag, data?: undefined): void;
	sendBroadcast(type: MessageType.defendedOpponent, data: Robot): void;
	sendBroadcast(type: MessageType.dueledOpponent, data: Robot): void;
	sendBroadcast(type: MessageType.defenderFlag, data?: undefined): void;
	sendBroadcast(type: MessageType.moveDest, pos: Position): void;
	sendBroadcast(type: MessageType.passSuggestion, suggestion: {ballPos: Position, time: number, anonymous: boolean, chip: boolean, manual: boolean}): void;
	sendBroadcast(type: MessageType.strikerFlag, data?: undefined): void;
	sendBroadcast(type: MessageType.strikerSamplingTimestamp, time: number): void;
	sendBroadcast(type: MessageType.attackPosition, pos: Position): void;
	sendBroadcast(type: MessageType.plannedAttackTime, time: number): void;
	sendBroadcast(type: MessageType.earliestAttackTime, time: number): void;
	sendBroadcast(type: MessageType.passInfo, info: {target: FriendlyRobot, ballPos: Position, time: number}[]): void;
	sendBroadcast(type: MessageType.shootDestination, dest: Position): void;
	sendBroadcast(type: ExclusiveRole, dest: FriendlyRobot | undefined): void;
	sendBroadcast(type: MessageType.placingRobot, data? : undefined): void;
	sendBroadcast(type: MessageType, data?: any): void {
		if (type === MessageType.plannedAttackTime && (data === -Infinity || data === Infinity)) throw new Error("Invalid PAttackTime");
		if (type === MessageType.earliestAttackTime && (data === -Infinity || data === Infinity)) throw new Error("Invalid EAttackTime");
		this.sendGeneric(type, "all", data, false);
	}

	// for trainer -> trainer messages
	private debugTrainerMessage(type: MessageType, data: any, repeated: boolean, messageCount: number) {
		debug.pushtop("Trainer -> Trainer Inbox");
		if (repeated) {
			debug.push(MessageType[type]);
			debug.set("" + (messageCount - 1), data);
			debug.pop(); // message type
		} else {
			debug.set(MessageType[type], data);
		}
		debug.pop(); // Trainer -> Trainer Inbox
	}

	// TODO: more specific send methods for the different cases to improve performance
	private sendGeneric(type: MessageType, receiver: "all" | "trainer" | FriendlyRobot, data: any, repeated: boolean) {
		// although a sender is adressing a robot, a message is delivered
		// to the corresponding agent. This ensures that a robot only receives
		// messages sent in frames where he has had the current agent
		if (receiver !== "all" && receiver !== "trainer") {
			receiver = (this.messaging._robotToAgent.get(receiver) as AgentLike).robot();
			if (receiver == undefined) {
				return; // not registered yet
			}
		}

		let messageBox = this.messaging._newMessages[type];
		if (messageBox == undefined) {
			messageBox = new Map<MessageOrigin, any>();
			this.messaging._newMessages[type] = messageBox;
		}
		let receiveBox = messageBox.get(receiver);
		if (receiveBox == undefined) {
			receiveBox = new Map<FriendlyRobot, any>();
			messageBox.set(receiver, receiveBox);
		}
		let senderRobot = (this.origin === "trainer") ? "trainer" : this.origin;

		let messageCount = 0;
		if (repeated) {
			let collection = receiveBox.get(senderRobot);
			if (collection == undefined) {
				collection = [];
			}
			collection.push(data);
			messageCount = collection.length;
			receiveBox.set(senderRobot, collection);
		} else {
			receiveBox.set(senderRobot, data);
		}

		// debug messages from the trainer to itself directly, since they can be immediately received
		if (receiver === "trainer" && this.origin === "trainer") {
			this.debugTrainerMessage(type, data, repeated, messageCount);
		}
	}


	// receive code
	// allyFlag, attackerFlag
	receive(type: MessageType.allyFlag, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, true>>;
	receive(type: MessageType.attackerFlag, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, true>>;
	receive(type: MessageType.defendedOpponent, ownMessage?: boolean): ReadonlyRec<Map<FriendlyRobot, Robot>>;
	receive(type: MessageType.dueledOpponent, ownMessage?: boolean): ReadonlyRec<Map<FriendlyRobot, Robot>>;
	receive(type: MessageType.defenderFlag, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, true>>;
	receive(type: MessageType.moveDest, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, Position>>;
	receive(type: MessageType.passSuggestion, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, {ballPos: Position, time: number, anonymous: boolean, chip: boolean, manual: boolean}>>;
	receive(type: MessageType.poolChangeRequest, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, "attacker" | "defender">>;
	receive(type: MessageType.strikerFlag, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, true>>;
	receive(type: MessageType.strikerSamplingTimestamp, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, number>>;
	receive(type: MessageType, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, any>> {
		return this.receiveGeneric(type, broadcast);
	}

	receiveSingleSender(type: MessageType.attackPosition, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, Position] | []>;
	receiveSingleSender(type: MessageType.earliestAttackTime, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, number] | []>;
	receiveSingleSender(type: MessageType.plannedAttackTime, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, number] | []>;
	receiveSingleSender(type: MessageType.passInfo, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, {target: FriendlyRobot, ballPos: Position, time: number}[]] | []>;
	receiveSingleSender(type: MessageType.shootDestination, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, Position] | []>;
	receiveSingleSender(type: MessageType.placingRobot, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, undefined] | []>;
	receiveSingleSender(type: MessageType, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, any]> | [] {
		let map: Map<FriendlyRobot, any> = this.receiveGeneric(type, broadcast);
		if (map.size > 1) {
			throw new Error(`Single sender message ${MessageType[type]} sent by ${map.size} robots!`);
		}
		const it = head(map);
		return it ? it : [];
	}

	receiveRepeated(type: MessageType.exclusiveRole, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, [ExclusiveRole, LeveledRating][]>>;
	receiveRepeated(type: MessageType.groupApplication, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, { name: "centerback" | "moves" | "striker" | "midfield", payload: any }[]>>;
	receiveRepeated(type: MessageType, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, any[]>> {
		return this.receiveGeneric(type, broadcast);
	}

	receiveTrainer(type: MessageType.centerBackPosTarget, broadcast?: boolean): ReadonlyRec<CenterBackPoint> | undefined;
	receiveTrainer(type: MessageType.moveAssignment, broadcast?: boolean): ReadonlyRec<{behavior: any, class: any, params: any, restart: boolean, mainAttacker: boolean}> | undefined;
	receiveTrainer(type: MessageType.moveInfo, broadcast?: boolean): ReadonlyRec<{ numAttackers: number, allowExtraAttackers: boolean }> | undefined;
	receiveTrainer(type: MessageType.roleAssignment, broadcast?: boolean):
		ReadonlyRec<{ name: "CenterBack", params: {pos: Position, dir: RelativePosition, time: number} }
		| { name: "ManMark", params: Robot[] } | { name: "ZoneDefense", params: [Position] }
		| { name: "Piggy", params: [Robot] } | undefined>;
	receiveTrainer(type: MessageType.strikerZone, broadcast?: boolean): ReadonlyRec<{ defaultPos: Position, boundaries: {left: number, right: number, top: number, bottom: number} }> | undefined;
	receiveTrainer(type: MessageType.midfieldZone, broadcast?: boolean): ReadonlyRec<{ defaultPos: Position, boundaries: {left: number, right: number, top: number, bottom: number } }> | undefined;
	receiveTrainer(type: MessageType.mainAttacker, broadcast?: boolean): ReadonlyRec<FriendlyRobot | undefined>;
	receiveTrainer(type: MessageType.duelAssistant, broadcast?: boolean): ReadonlyRec<FriendlyRobot | undefined>;
	receiveTrainer(type: MessageType.interceptPass, broadcast?: boolean): ReadonlyRec<FriendlyRobot | undefined>;
	receiveTrainer(type: MessageType.exchangeRobot, broadcast?: boolean): ReadonlyRec<FriendlyRobot | undefined>;
	receiveTrainer(type: MessageType, broadcast?: boolean): any {
		return this.receiveGeneric(type, broadcast).get("trainer");
	}

	receiveTrainerRepeated(type: MessageType.forcePoolChange): ReadonlyRec<{ robot: FriendlyRobot, destPool: "manual" | "ally" | "keeper" | "defender" | "attacker" | "hidden" }[]> | undefined;
	receiveTrainerRepeated(type: MessageType, broadcast?: boolean): ReadonlyRec<any[]> | undefined {
		return this.receiveGeneric(type, broadcast).get("trainer");
	}

	public receiveGeneric(type: MessageType, broadcast?: boolean) {
		let mtypeBox = this.messaging._deliveredMessages[type];
		if (this.origin === "trainer") {
			mtypeBox = this.messaging._newMessages[type];
		}
		if (mtypeBox == undefined) {
			return emptyMap;
		}
		// returns all messages of "type" which were sent to "all"
		if (broadcast) {
			if (mtypeBox.get("all") == undefined) {
				return emptyMap;
			}
			return mtypeBox.get("all");
		}
		let receiveBox = mtypeBox.get(this.origin);
		let allBox: Map<MessageOrigin, any> | undefined = mtypeBox.get("all");
		if (receiveBox == undefined && allBox == undefined) {
			return emptyMap;
		} else {
			if (receiveBox == undefined) {
				receiveBox = new Map<FriendlyRobot, any>();
				mtypeBox.set(this.origin, receiveBox);
			}
			if (allBox) {
				let allMerged = mtypeBox.get("allBoxMerged");
				if (allMerged == undefined) {
					allMerged = new Map();
					mtypeBox.set("allBoxMerged", allMerged);
				}
				if (allMerged.get(this.origin) == undefined) { // merge broadcasts into receiveBox
					let receiverRobot = (this.origin === "trainer") ? "trainer" : this.origin;
					for (let sender of allBox.keys()) {
						let data = allBox.get(sender);
						if (sender !== receiverRobot || this.origin === "trainer") {
							receiveBox.set(sender, data);
						}
					}
					allMerged.set(this.origin, true);
				}
			}

			return receiveBox;
		}
	}

	public receiveNoBroadcast(type: MessageType) {
		let mtypeBox = this.messaging._deliveredMessages[type];
		if (this.origin === "trainer") {
			mtypeBox = this.messaging._newMessages[type];
		}
		if (mtypeBox == undefined) {
			return emptyMap;
		}
		let receiveBox = mtypeBox.get(this.origin);
		if (receiveBox == undefined) {
			return emptyMap;
		} else {
			return receiveBox;
		}
	}

	public receiveAllInbox(type: MessageType) {
		let mtypeBox = this.messaging._deliveredMessages[type];
		if (this.origin === "trainer") {
			mtypeBox = this.messaging._newMessages[type];
		}
		if (mtypeBox == undefined) {
			return emptyMap;
		}
		if (mtypeBox.get("all") == undefined) {
			return emptyMap;
		}
		return mtypeBox.get("all");
	}
}

export class Messaging {

	_newMessages: {[type: number]: Map<MessageOrigin | "all" | "allBoxMerged", any | any[]>} = {}; // is reset every frame
	_deliveredMessages: {[type: number]: Map<MessageOrigin | "all" | "allBoxMerged", any | any[]>} = {}; // reference to the newMessages table of the last last frame
	// messages are stored in the following format:
	// messages = {
	// 	messageTypeA = {
	// 		Agent1 = { senderRobot1 = data, senderRobot2 = data}, ...
	// 	},
	// 	messageTypeB = { Agent3 = { senderRobot4 = data} }
	// }
	_robotToAgent: Map<FriendlyRobot, AgentLike> = new Map<FriendlyRobot, AgentLike>();
	_trainerRegistered = false;

	constructor() {
		//
	}

	registerAgent(agent: AgentLike): MessageBox {
		this._robotToAgent.set(agent.robot(), agent);
		return new MessageBox(this, agent.robot());
	}

	registerTrainer(): MessageBox {
		if (this._trainerRegistered) {
			throw new Error("trainer is already registered!");
		}
		this._trainerRegistered = true;
		return new MessageBox(this, "trainer");
	}

	// this method should be called once every frame
	deliverMessages() {
		this._deliveredMessages = this._newMessages;
		this._newMessages = {};
	}
}
