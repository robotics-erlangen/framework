import * as debug from "base/debug";
import { FriendlyRobot, Robot } from "base/robot";
import { AbsTime } from "base/timing";
import { Position, RelativePosition } from "base/vector";
import * as World from "base/world";

import { Point as CenterBackPoint } from "glados/group/centerback";
import { Assignment as MoveAssignment, MoveInfo } from "glados/group/moves";
import { ForcePoolChange } from "glados/trainer/attackratio";
import { RoleAssignment } from "glados/trainer/defense";
import { Application as GroupApplication } from "glados/trainer/groups";
import { ExclusiveRoleApplication } from "glados/trainer/roles";
import { PassInfo, PassSuggestion } from "glados/util/attack";
import { head } from "glados/util/collections";

interface Zone {
	defaultPos: Position;
	boundaries: { left: number, right: number, top: number, bottom: number };
}

export enum MessageType {
	// =======================
	// === multiple sender ===
	// =======================

	/** Sent by robots we don't control (mixed team challenge) */
	allyFlag,
	/** Sent by all attackers */
	attackerFlag,
	/** Sent by `t/s/duel` to make sure that the opponent duelist does not get marked as well */
	defendedOpponent,
	/**
	 * Sent by `t/s/duel` to inform the duel assistant which opponent is
	 * currently dueled.
	 *
	 * This is different from {@link defendedOpponent} since the robot may not be
	 * actually defended (since the duelist may be to far away), but we still
	 * want the duel assistant to help.
	 */
	dueledOpponent,
	/** Sent by all defenders */
	defenderFlag,
	/** Sent by various tasks to notify other robots about their future positioning */
	moveDest,
	/** Sent by strikers to the MA to propose a possible pass. Also see {@link PassSuggestion} */
	passSuggestion,
	/** Sent by various behaviors which want to change the pool. */
	poolChangeRequest,
	/** Sent by all strikers */
	strikerFlag,
	/** Sent by `t/a/striker` to tell all other strikers about the currency of the sampled pass position */
	strikerSamplingTimestamp,

	// =====================
	// === single sender ===
	// =====================

	/** Sent by the MA to tell other attackers about the origin of the next shot */
	attackPosition,
	/**
	 * Sent by the MA to tell other attackers about the planned time of the
	 * next shot. Also see {@link earliestAttackTime}.
	 */
	plannedAttackTime,
	/** Sent by `gr/centerback` to assign a target and a position to the centerback tasks. */
	centerBackPosTarget,
	/**
	 * Sent by the MA to tell other attackers about the earliest possible time
	 * of the next shot. Also see {@link plannedAttackTime}.
	 */
	earliestAttackTime,
	/** Sent by `gr/moves` to the participating agents. */
	moveAssignment,
	/**
	 * Sent by `gr/moves` to `tr/attackratio` to overwrite the number of attackers.
	 * Also sent to all robots so the attackerpool can make informed decisions
	 * which robot not to drop during a move. As this information has to be read
	 * after calling deliverMessages, this message is sent to each agent.
	 * In the first frame of each move, the attackers field ist an empty array
	 * of size of requested attackers. In each following frame it contains all attackers
	 * participating in this move.
	 */
	moveInfo,
	/**
	 * Sent by the MA to notify all agents about an upcoming pass.
	 *
	 * When the ball is actually shot, there should only be one entry in the
	 * table. This is needed to choose the correct mainAttacker.
	 */
	passInfo,
	/**
	 * Sent by `tr/defense` to assign a behavior to each defender.
	 *
	 * See {@link RoleAssignment} for the possible parameters.
	 */
	roleAssignment,
	/** sent by the MA to tell other attackers about the destination of the next shot */
	shootDestination,
	/** Sent by `gr/striker` to assign zones to the striker tasks */
	strikerZone,
	/** Sent by `gr/midfield` to assign zones to the midfield tasks */
	midfieldZone,
	/** Sent by `t/a/placeball` to inform that he is placing the ball. */
	placingRobot,

	// =======================
	// === Exclusive roles ===
	// =======================

	/** The only robot that should touch the ball. Also the one who will shoot it next. */
	mainAttacker,
	/**
	 * The assistant to the duelist. Often becomes the next duelist when the
	 * current duelist loses the ball to his opponent.
	 */
	duelAssistant,
	/**
	 * A role taken by a CenterBack. Its purpose is to deflect cross passes in
	 * front of our defense area, without necessarily taking control of the
	 * ball.
	 */
	interceptPass,
	/**
	 * A role taken by attackers. Selects the robot that should be
	 * automatically exchanged after a yellow card.
	 */
	exchangeRobot,

	// =========================
	// === Repeated messages ===
	// =========================

	/**
	 * Sent by agents that want to apply for an exclusive role.
	 * See {@link ExclusiveRole} for a list of these roles.
	 */
	exclusiveRole,
	/** Sent by `gr/moves` to make sure that unassigned robots become defenders */
	forcePoolChange,
	/**
	 * Sent by agents that want to join a specific group.
	 * The list of groups is defined in `tr/groups`
	 */
	groupApplication
}

export type ExclusiveRole = MessageType.mainAttacker | MessageType.duelAssistant | MessageType.interceptPass | MessageType.exchangeRobot;

/*
 * Enums in Typescript are objects with two members per variant: A number
 * mapping to the name of the variant, and the name mapping to that number.
 * Thus we can just filter out the names to get a list of all possible
 * variants.
 */
export const MessageTypeList: MessageType[] = Object.keys(MessageType)
	.map((key) => parseInt(key, 10))
	.filter((key) => !isNaN(key));

type MessageOrigin = "trainer" | FriendlyRobot;

interface AgentLike {
	isAgent(): boolean;
	robot(): FriendlyRobot;
}

/*
 * This type assertion is valid, since the frozen objects contain all the
 * original properties. However, Object.freeze returns a `Readonly<T>`, which
 * does a `keyof T`, which does not properly copy well known symbols (in this
 * case `[Symbol.iterator]`, see https://github.com/microsoft/TypeScript/issues/24622)
 *
 * Also, this uses `ReadonlyRec` instead of `Readonly`. `ReadonlyRec` returns
 * `ReadonlyMap` instead of Readonly<Map>, which is correct for maps that don't
 * allow adding new elements. `ReadonlyMap` removes the `set` function, while
 * `Readonly<Map>` just disallows code like `map.set = (k, v) => {}`
 */
const emptyMap = Object.freeze(new Map<FriendlyRobot, any>()) as unknown as ReadonlyRec<Map<FriendlyRobot, any>>;

export class MessageBox {
	private messaging: Messaging;
	private origin: MessageOrigin;


	constructor(messaging: Messaging, origin: MessageOrigin) {
		this.messaging = messaging;
		this.origin = origin;
	}

	send(type: MessageType.centerBackPosTarget, dest: FriendlyRobot, target: CenterBackPoint): void;
	send(type: MessageType.moveAssignment, dest: FriendlyRobot, assignment: MoveAssignment): void;
	send(type: MessageType.roleAssignment, dest: FriendlyRobot, assignment: RoleAssignment): void;
	send(type: MessageType.strikerZone, dest: FriendlyRobot, zone: Zone): void;
	send(type: MessageType.midfieldZone, dest: FriendlyRobot, zone: Zone): void;
	send(type: MessageType, dest: FriendlyRobot, data?: any): void {
		this.sendGeneric(type, dest, data, false);
	}

	sendRepeated(type: MessageType, dest: FriendlyRobot, data?: any): void {
		this.sendGeneric(type, dest, data, true);
	}

	sendToTrainer(type: MessageType.poolChangeRequest, changeTo: "attacker" | "defender"): void;
	sendToTrainer(type: MessageType, data?: any): void {
		this.sendGeneric(type, "trainer", data, false);
	}

	sendToTrainerRepeated(type: MessageType.exclusiveRole, role: ExclusiveRoleApplication): void;
	sendToTrainerRepeated(type: MessageType.forcePoolChange, info: ForcePoolChange): void;
	sendToTrainerRepeated(type: MessageType.groupApplication, group: GroupApplication): void;
	sendToTrainerRepeated(type: MessageType, data?: any): void {
		this.sendGeneric(type, "trainer", data, true);
	}

	sendBroadcast(type: MessageType.allyFlag, data?: undefined): void;
	sendBroadcast(type: MessageType.attackerFlag, data?: undefined): void;
	sendBroadcast(type: MessageType.defendedOpponent, data: Robot): void;
	sendBroadcast(type: MessageType.dueledOpponent, data: Robot): void;
	sendBroadcast(type: MessageType.defenderFlag, data?: undefined): void;
	sendBroadcast(type: MessageType.moveDest, pos: Position): void;
	sendBroadcast(type: MessageType.passSuggestion, suggestion: PassSuggestion): void;
	sendBroadcast(type: MessageType.strikerFlag, data?: undefined): void;
	sendBroadcast(type: MessageType.strikerSamplingTimestamp, time: number): void;
	sendBroadcast(type: MessageType.attackPosition, pos: Position): void;
	sendBroadcast(type: MessageType.plannedAttackTime, time: number): void;
	sendBroadcast(type: MessageType.earliestAttackTime, time: number): void;
	sendBroadcast(type: MessageType.passInfo, info: PassInfo[]): void;
	sendBroadcast(type: MessageType.shootDestination, dest: Position): void;
	sendBroadcast(type: ExclusiveRole, dest: FriendlyRobot | undefined): void;
	sendBroadcast(type: MessageType.placingRobot, data? : undefined): void;
	sendBroadcast(type: MessageType.moveInfo, info: MoveInfo): void;
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
	receive(type: MessageType.allyFlag, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, undefined>>;
	receive(type: MessageType.attackerFlag, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, undefined>>;
	receive(type: MessageType.defendedOpponent, ownMessage?: boolean): ReadonlyRec<Map<FriendlyRobot, Robot>>;
	receive(type: MessageType.dueledOpponent, ownMessage?: boolean): ReadonlyRec<Map<FriendlyRobot, Robot>>;
	receive(type: MessageType.defenderFlag, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, undefined>>;
	receive(type: MessageType.moveDest, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, Position>>;
	receive(type: MessageType.passSuggestion, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, PassSuggestion>>;
	receive(type: MessageType.poolChangeRequest, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, "attacker" | "defender">>;
	receive(type: MessageType.strikerFlag, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, undefined>>;
	receive(type: MessageType.strikerSamplingTimestamp, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, number>>;
	receive(type: MessageType, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, any>> {
		return this.receiveGeneric(type, broadcast) as ReadonlyRec<Map<FriendlyRobot, any>>;
	}

	receiveSingleSender(type: MessageType.attackPosition, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, Position] | []>;
	receiveSingleSender(type: MessageType.earliestAttackTime, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, number] | []>;
	receiveSingleSender(type: MessageType.plannedAttackTime, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, number] | []>;
	receiveSingleSender(type: MessageType.passInfo, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, PassInfo[]] | []>;
	receiveSingleSender(type: MessageType.shootDestination, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, Position] | []>;
	receiveSingleSender(type: MessageType.placingRobot, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, undefined] | []>;
	receiveSingleSender(type: MessageType, broadcast?: boolean): ReadonlyRec<[FriendlyRobot, any] | []>  {
		const map = this.receiveGeneric(type, broadcast);
		if (map.size > 1) {
			throw new Error(`Single sender message ${MessageType[type]} sent by ${map.size} robots!`);
		}
		const it = head(map);
		return it
			? it as ReadonlyRec<[FriendlyRobot, any]>
			: [];
	}

	receiveRepeated(type: MessageType.exclusiveRole, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, ExclusiveRoleApplication[]>>;
	receiveRepeated(type: MessageType.groupApplication, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, GroupApplication[]>>;
	receiveRepeated(type: MessageType, broadcast?: boolean): ReadonlyRec<Map<FriendlyRobot, any[]>> {
		return this.receiveGeneric(type, broadcast) as ReadonlyRec<Map<FriendlyRobot, any[]>>;
	}

	receiveTrainer(type: MessageType.centerBackPosTarget, broadcast?: boolean): ReadonlyRec<CenterBackPoint | undefined>;
	receiveTrainer(type: MessageType.moveAssignment, broadcast?: boolean): ReadonlyRec<MoveAssignment | undefined>;
	receiveTrainer(type: MessageType.roleAssignment, broadcast?: boolean): ReadonlyRec<RoleAssignment | undefined>;
	receiveTrainer(type: MessageType.strikerZone, broadcast?: boolean): ReadonlyRec<Zone | undefined>;
	receiveTrainer(type: MessageType.midfieldZone, broadcast?: boolean): ReadonlyRec<Zone | undefined>;
	receiveTrainer(type: MessageType.mainAttacker, broadcast?: boolean): ReadonlyRec<FriendlyRobot | undefined>;
	receiveTrainer(type: MessageType.duelAssistant, broadcast?: boolean): ReadonlyRec<FriendlyRobot | undefined>;
	receiveTrainer(type: MessageType.interceptPass, broadcast?: boolean): ReadonlyRec<FriendlyRobot | undefined>;
	receiveTrainer(type: MessageType.exchangeRobot, broadcast?: boolean): ReadonlyRec<FriendlyRobot | undefined>;
	receiveTrainer(type: MessageType.moveInfo, broadcast?: boolean): ReadonlyRec<MoveInfo | undefined>;
	receiveTrainer(type: MessageType, broadcast?: boolean): any {
		return this.receiveGeneric(type, broadcast).get("trainer");
	}

	receiveTrainerRepeated(type: MessageType.forcePoolChange): ReadonlyRec<ForcePoolChange[] | undefined>;
	receiveTrainerRepeated(type: MessageType, broadcast?: boolean): ReadonlyRec<any[] | undefined> {
		return this.receiveGeneric(type, broadcast).get("trainer");
	}

	public receiveGeneric(type: MessageType, broadcast?: boolean): ReadonlyRec<Map<MessageOrigin, any>> {
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

	public receiveNoBroadcast(type: MessageType): ReadonlyRec<Map<MessageOrigin, any>> {
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

	public receiveAllInbox(type: MessageType): ReadonlyRec<Map<MessageOrigin, any>> {
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

/**
 * Display messages in the debug tree. If a message contains a timestamp, this
 * function will display both the original absolute time and a relative time.
 * @param name - The name of the subtree where the messages will be displayed
 * @param messages - The messages to dump along with their sender
 */
export function dumpMessages(name: string, messages: ReadonlyRec<Map<MessageOrigin, any>>): void {
	if (messages.size === 0) {
		return;
	}
	debug.push(name);
	for (let [sender, msg] of messages.entries()) {
		const indexValue = sender === "trainer" ? sender : sender.id.toString();
		if (name.toLowerCase().indexOf("time") === -1) {
			debug.set(indexValue, msg);
			if (typeof msg === "object" && msg.time !== undefined && typeof msg.time === "number") {
				debug.set(indexValue + "/time", formatTimestamp(msg.time));
			}
		} else if (typeof msg === "number") {
			debug.set(indexValue, formatTimestamp(msg));
		} else {
			debug.set(indexValue, msg);
		}
	}
	debug.pop(); // name
}

function formatTimestamp(absTime: AbsTime): string {
	const relTime = absTime - World.Time;
	return `${relTime.toFixed(4)} (${absTime.toFixed(0)})`;
}
