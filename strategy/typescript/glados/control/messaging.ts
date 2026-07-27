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
import { FriendlyRobot, Robot } from "base/robot";
import { AbsTime } from "base/timing";
import { Position, RelativePosition } from "base/vector";
import * as World from "base/world";

import { Objective } from "glados/agent/base/objective";
import { Point as CenterBackPoint } from "glados/group/centerback";
import { FeintPassTarget } from "glados/group/feintpass";
import { Assignment as MoveAssignment, MoveInfo } from "glados/group/moves";
import { ForcePoolChange } from "glados/trainer/attackratio";
import { RoleAssignment } from "glados/trainer/defense";
import { Application as GroupApplication } from "glados/trainer/groups";
import { ExclusiveRoleApplication } from "glados/trainer/roles";
import { PassInfo, PassSuggestion } from "glados/util/attack";
import { head } from "glados/util/collections";
import { Zone } from "glados/util/zone";

/*
 * How to add a new message:
 * 1. Add a variant to the MessageType enum
 * 2. - If the message is to designate an exclusive role, add the new variant
 *      to the ExclusiveRole type
 *    - Otherwise, add a descriptor to the NormalDescriptor interface
 */

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
	/** Sent by supporters to the MA to propose a possible pass. Also see {@link PassSuggestion} */
	passSuggestion,
	/** Sent by various behaviors which want to change the pool. */
	poolChangeRequest,
	/** Sent by all strikers */
	strikerFlag,
	/** Sent by `t/a/support` to tell all other supporters about the currency of the sampled pass position */
	supportSamplingTimestamp,

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
	/** Sent by `gr/support` to assign zones to the support tasks */
	supportZone,
	/** Sent by `t/a/placeball` to inform that he is placing the ball. */
	placingRobot,
	/** Sent by the MA to inform support attackers about the current objective */
	selectedObjective,
	/** Sent by gr/dummy to assign zones to the dummy robots */
	dummyZone,
	/** Sent by gr/feintpass to assign feint positions to robots */
	feintPassTarget,

	/** Sent by trainer/attackratio to inform decisions made by the MA if it e.g. should accept pass suggestions */
	limitedAttackerCount,

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

/**
 * Possible senders for messages.
 *
 * Important: If you intend to add another variant here, you'll have to make
 * sure the `Receive*` types below are disjunct
 */
type Sender = "robot" | "trainer";

/**
 * Possible senders for messages.
 *
 * Important: If you intend to add another variant here, you'll have to make
 * sure the `Send*` types below are disjunct
 */
type Receiver = "robot" | "trainer" | "broadcast";

type BaseDescriptor = {
	[M in MessageType]: {
		data?: unknown;
		sender: Sender;
		receiver: Receiver;
		repeated?: boolean;
		singleSender?: boolean;
	}
};

type ExclusiveRoleDescriptor = {
	[M in ExclusiveRole]: {
		data: FriendlyRobot;
		sender: "trainer";
		receiver: "broadcast";
	}
};

/**
 * Describes attributes of messages. Attributes are:
 * - `data`: The message's payload
 * - `sender`: Who sends the message (influences which receive function is used)
 * - `receiver`: Who receives the message (influences which send function is used)
 * - `repeated`: Whether this message can be sent multiple times by the same sender
 * - `singleSender`: Whether this message is sent by at most one sender
 */
interface NormalDescriptor extends BaseDescriptor {
	[MessageType.centerBackPosTarget]: {
		data: CenterBackPoint;
		sender: "trainer";
		receiver: "robot";
	};
	[MessageType.moveAssignment]: {
		data: MoveAssignment;
		sender: "trainer";
		receiver: "robot";
	};
	[MessageType.roleAssignment]: {
		data: RoleAssignment;
		sender: "trainer";
		receiver: "robot";
	};
	[MessageType.supportZone]: {
		data: Zone;
		sender: "trainer";
		receiver: "robot";
	};
	[MessageType.dummyZone]: {
		data: Zone;
		sender: "trainer";
		receiver: "robot";
	};
	[MessageType.poolChangeRequest]: {
		data: "attacker" | "defender";
		sender: "robot";
		receiver: "trainer";
	};
	[MessageType.exclusiveRole]: {
		data: ExclusiveRoleApplication;
		sender: "robot";
		receiver: "trainer";
		repeated: true;
	};
	[MessageType.forcePoolChange]: {
		data: ForcePoolChange;
		sender: "trainer";
		receiver: "trainer";
		repeated: true;
	};
	[MessageType.groupApplication]: {
		data: GroupApplication;
		sender: "robot";
		receiver: "trainer";
		repeated: true;
	};
	[MessageType.allyFlag]: {
		sender: "robot";
		receiver: "broadcast";
	};
	[MessageType.attackerFlag]: {
		sender: "robot";
		receiver: "broadcast";
	};
	[MessageType.defendedOpponent]: {
		data: Robot;
		sender: "robot";
		receiver: "broadcast";
	};
	[MessageType.dueledOpponent]: {
		data: Robot;
		sender: "robot";
		receiver: "broadcast";
	};
	[MessageType.defenderFlag]: {
		sender: "robot";
		receiver: "broadcast";
	};
	[MessageType.moveDest]: {
		data: Position;
		sender: "robot";
		receiver: "broadcast";
	};
	[MessageType.passSuggestion]: {
		data: PassSuggestion;
		sender: "robot";
		receiver: "broadcast";
	};
	[MessageType.strikerFlag]: {
		sender: "robot";
		receiver: "broadcast";
	};
	[MessageType.supportSamplingTimestamp]: {
		data: number;
		sender: "robot";
		receiver: "broadcast";
	};
	[MessageType.attackPosition]: {
		data: Position;
		sender: "robot";
		receiver: "broadcast";
		singleSender: true;
	};
	[MessageType.plannedAttackTime]: {
		data: number;
		sender: "robot";
		receiver: "broadcast";
		singleSender: true;
	};
	[MessageType.earliestAttackTime]: {
		data: number;
		sender: "robot";
		receiver: "broadcast";
		singleSender: true;
	};
	[MessageType.passInfo]: {
		data: PassInfo[];
		sender: "robot";
		receiver: "broadcast";
		singleSender: true;
	};
	[MessageType.shootDestination]: {
		data: Position;
		sender: "robot";
		receiver: "broadcast";
		singleSender: true;
	};
	[MessageType.placingRobot]: {
		sender: "robot";
		receiver: "broadcast";
		singleSender: true;
	};
	[MessageType.selectedObjective]: {
		data: Objective;
		sender: "robot";
		receiver: "broadcast";
		singleSender: true;
	};
	[MessageType.moveInfo]: {
		data: MoveInfo;
		sender: "trainer";
		receiver: "broadcast";
	};
	[MessageType.feintPassTarget]: {
		data: FeintPassTarget;
		sender: "trainer";
		receiver: "robot";
		repeated: false;
	};
	[MessageType.limitedAttackerCount]: {
		data: number; // amount of attackers
		sender: "trainer";
		receiver: "broadcast";
		repeated: false;
	};
}

type Descriptor = NormalDescriptor & ExclusiveRoleDescriptor;

/*
 * Utility types to filter MessageTypes by their attributes
 *
 * This makes use of distributive conditional types
 * (see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types)
 * The feature only triggers if there is a raw type variable preceding the
 * extends clause. This means, `M extends ...` will trigger distribution, but
 * `Descriptor[M] extends ...` will not. Thats why there is an `M extends any`
 * clause at the beginning of each type definition. The condition is always
 * true since `any` is parent to all types.
 *
 * Since these types are meant to be used on unions of MessageType variants and
 * will thus return a union of the properties of the respective variants, it is
 * important to use `never` in cases where a certain variant is unwanted (since
 * `never` is the neutral element in type unions)
 * For example: `SentBy<S, M>` should return all MessageTypes in M that are
 * sent by S. For messages that don't have the wanted Sender, never is returned
 */

/** Filter out messages that are not sent by the wanted sender */
type SentBy<S extends Sender, M extends MessageType> = M extends any
	? Descriptor[M] extends { sender: S }
		? M
		: never
	: never;

/** Filter out messages that are not received by the wanted receiver */
type ReceivedBy<R extends Receiver, M extends MessageType> = M extends any
	? Descriptor[M] extends { receiver: R }
		? M
		: never
	: never;

/**
 * Get the type of the data associated with a message or undefined if it specifies no
 * data type
 */
type DataOf<M extends MessageType> = M extends any
	? Descriptor[M] extends { data: infer D }
		? D
		: undefined
	: never;

/** Returns whether there is data associated with the given message */
type HasData<M extends MessageType> = M extends any
	? DataOf<M> extends undefined
		? false
		: true
	: never;

/**
 * Retrieve only messages that have (`D == true`) or don't have (`D == false`)
 * data associated with them
 */
type FilterData<D extends boolean, M extends MessageType> = M extends any
	? HasData<M> extends D
		? M
		: never
	: never;

/** Whether the given message is repeated */
type IsRepeated<M extends MessageType> = M extends any
	? Descriptor[M] extends { repeated: infer R }
		? R extends true
			? true
			: false
		: false
	: never;

/**
 * Retrieve only messages that are (`R == true`) or are not (`R == false`)
 * repeated
 */
type SelectRepeated<R extends boolean, M extends MessageType> = M extends any
	? IsRepeated<M> extends R
		? M
		: never
	: never;

/** Whether the given message is sent by a single sender only */
type IsSingleSender<M extends MessageType> = M extends any
	? Descriptor[M] extends { singleSender: infer S }
		? S extends true
			? true
			: false
		: false
	: never;

/**
 * Retrieve only messages that are (`R == true`) or are not (`R == false`)
 * single sender
 */
type SelectSingleSender<S extends boolean, M extends MessageType> = M extends any
	? IsSingleSender<M> extends S
		? M
		: never
	: never;

/**
 * Returns the type of the data returned by a receive function for the
 * specified message type. This is just the specified data or an array thereof
 * for repeated messages
 */
type ReceivedData<M extends MessageType> = M extends any
	? IsRepeated<M> extends true
		? DataOf<M>[]
		: DataOf<M>
	: never;

/*
 * Enums in Typescript are objects with two members per variant: A number
 * mapping to the name of the variant, and the name mapping to that number.
 * Thus we can just filter out the names to get a list of all possible
 * variants.
 */
export const MESSAGE_TYPE_LIST: MessageType[] = Object.keys(MessageType)
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

type Send = ReceivedBy<"robot", SelectRepeated<false, MessageType>>;
type SendRepeated = ReceivedBy<"robot", SelectRepeated<true, MessageType>>;

type SendToTrainer = ReceivedBy<"trainer", SelectRepeated<false, MessageType>>;
type SendToTrainerRepeated = ReceivedBy<"trainer", SelectRepeated<true, MessageType>>;

type SendBroadcast = ReceivedBy<"broadcast", MessageType>;
type SendBroadcastNoData = ReceivedBy<"broadcast", FilterData<false, MessageType>>;

type Receive = SentBy<"robot", SelectRepeated<false, SelectSingleSender<false, MessageType>>>;
type ReceiveSingleSender = SentBy<"robot", SelectRepeated<false, SelectSingleSender<true, MessageType>>>;

type ReceiveRepeated = SentBy<"robot", SelectRepeated<true, SelectSingleSender<false, MessageType>>>;

type ReceiveTrainer = SentBy<"trainer", SelectRepeated<false, MessageType>>;
type ReceiveTrainerRepeated = SentBy<"trainer", SelectRepeated<true, MessageType>>;

export type MessageBox = Messaging.MessageBox;

declare namespace Messaging {
	type MessageBox = typeof Messaging.MessageBox.prototype;
}

export class Messaging {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	public static readonly MessageBox = class {
		private _messaging: Messaging;
		private _origin: MessageOrigin;


		public constructor(messaging: Messaging, origin: MessageOrigin) {
			this._messaging = messaging;
			this._origin = origin;
		}

		/**
		 * Send a message to a certain robot. If a message of the same
		 * sender-receiver-type constellation was already sent it will be
		 * overwritten.
		 * @param type - Which message to send
		 * @param dest - The robot that will receive the message
		 * @param data - The message data
		 */
		public send<M extends Send>(type: M, dest: FriendlyRobot, data: DataOf<M>): void {
			this._sendGeneric(type, dest, data, false);
		}

		/**
		 * Send a repeated message to a certain robot. Multiple messages of the
		 * same type can be sent by the same robot to the same receiver.
		 * @param type - Which message to send
		 * @param dest - The robot that will receive the message
		 * @param data - The message data
		 */
		public sendRepeated<M extends SendRepeated>(type: M, dest: FriendlyRobot, data: DataOf<M>): void {
			this._sendGeneric(type, dest, data, true);
		}

		/**
		 * Send a message to the trainer. If a message of the same sender-type
		 * constellation was already sent it will be overwritten
		 * @param type - Which message to send
		 * @param data - The message data
		 */
		public sendToTrainer<M extends SendToTrainer>(type: M, data: DataOf<M>): void {
			this._sendGeneric(type, "trainer", data, false);
		}

		/**
		 * Send a repeated message to the trainer. Multiple messages of the same
		 * type can be sent by the same robot.
		 * @param type - Which message to send
		 * @param data - The message data
		 */
		public sendToTrainerRepeated<M extends SendToTrainerRepeated>(type: M, data: DataOf<M>): void {
			this._sendGeneric(type, "trainer", data, true);
		}

		/**
		 * Broadcast a flag message. Will be received by all robots and the
		 * trainer.
		 * @param type - Which flag to send
		 */
		public sendBroadcast<M extends SendBroadcastNoData>(type: M, data?: undefined): void;
		/**
		 * Send a broadcast message. Will be received by all robots and the
		 * trainer.
		 * @param type - Which message to send
		 * @param data - The message data
		 * @param impersonation - Send the message in the name of someone else.
		 * Only the trainer is allowed to do this. Note, that for non repeated
		 * messages, messages sent by the impersonated sender will be overwritten.
		 *
		 * TODO Replace with proper sender types, see #936
		 */
		public sendBroadcast(type: MessageType.selectedObjective, data: DataOf<MessageType.selectedObjective>, impersonation?: MessageOrigin): void;
		/**
		 * Send a broadcast message. Will be received by all robots and the
		 * trainer.
		 * @param type - Which message to send
		 * @param data - The message data
		 */
		public sendBroadcast<M extends SendBroadcast>(type: M, data: DataOf<M>): void;
		public sendBroadcast<M extends SendBroadcast | SendBroadcastNoData>(type: M, data: DataOf<M>, impersonation?: MessageOrigin): void {
			if (type === MessageType.plannedAttackTime && (data === -Infinity || data === Infinity)) throw new Error("Invalid PAttackTime");
			if (type === MessageType.earliestAttackTime && (data === -Infinity || data === Infinity)) throw new Error("Invalid EAttackTime");
			this._sendGeneric(type, "all", data, false, impersonation);
		}

		// for trainer -> trainer and impersonated messages
		private _debugTrainerMessage(type: MessageType, data: any, repeated: boolean, messageCount: number, impersonation?: MessageOrigin) {
			debug.pushtop("Trainer -> Trainer Inbox");

			const messageName = impersonation && impersonation !== "trainer"
			? `${MessageType[type]} (as Agent ${impersonation.id})`
			: MessageType[type];

			if (repeated) {
				debug.push(messageName);
				debug.set(`${messageCount - 1}`, data);
				debug.pop(); // message type
			} else {
				debug.set(messageName, data);
			}
			debug.pop(); // Trainer -> Trainer Inbox
		}

		// TODO: more specific send methods for the different cases to improve performance
		private _sendGeneric<M extends MessageType>(type: M, receiver: "all" | "trainer" | FriendlyRobot, data: DataOf<M>, repeated: boolean, impersonation?: MessageOrigin) {
			if (impersonation !== undefined && this._origin !== "trainer") {
				throw new Error("Only the trainer is allowed to impersonate agents");
			}

			// although a sender is adressing a robot, a message is delivered
			// to the corresponding agent. This ensures that a robot only receives
			// messages sent in frames where he has had the current agent
			if (receiver !== "all" && receiver !== "trainer") {
				receiver = (this._messaging._robotToAgent.get(receiver) as AgentLike).robot();
				if (receiver == undefined) {
					return; // not registered yet
				}
			}

			let messageBox = this._messaging._newMessages[type];
			if (messageBox == undefined) {
				messageBox = new Map<MessageOrigin, any>();
				this._messaging._newMessages[type] = messageBox;
			}
			let receiveBox = messageBox.get(receiver);
			if (receiveBox == undefined) {
				receiveBox = new Map<FriendlyRobot, any>();
				messageBox.set(receiver, receiveBox);
			}

			const sender = impersonation ?? this._origin;

			let messageCount = 0;
			if (repeated) {
				let collection = receiveBox.get(sender);
				if (collection == undefined) {
					collection = [];
				}
				collection.push(data);
				messageCount = collection.length;
				receiveBox.set(sender, collection);
			} else {
				receiveBox.set(sender, data);
			}

			// debug messages from the trainer to itself directly, since they can be immediately received
			if (impersonation !== undefined
				|| (receiver === "trainer" && this._origin === "trainer")) {
				this._debugTrainerMessage(type, data, repeated, messageCount, impersonation);
			}
		}


		/**
		 * Retrieve messages of a certain type sent to this box.
		 * @param type - Which message to receive
		 * @param receiveOwn - Whether to receive messages sent by this message box
		 * @returns all messages of this type sent to this box along with their sender
		 */
		public receive<M extends Receive>(type: M, receiveOwn?: boolean): ReadonlyRec<Map<FriendlyRobot, ReceivedData<M>>> {
			return this.receiveGeneric(type, receiveOwn) as ReadonlyRec<Map<FriendlyRobot, any>>;
		}

		/**
		 * Retrieve the `selectedObjective` message. This overload is required,
		 * since objects returned by receive functions are usually immutable.
		 * However, the objective lives in the messaging to allow the objective to
		 * be reused even if the MA switches from defender to attacker. For this
		 * reason it has to hold mutable state.
		 *
		 * This overload has to be higher up since `MessageType.selectedObjective`
		 * is included in `ReceiveSingleSender`
		 *
		 * @param type - `MessageType.selectedObjective`
		 * @param receiveOwn - Whether to receive messages sent by this message box
		 * @returns the message along with its sender or an empty tuple if the message wasn't sent
		 */
		public receiveSingleSender(type: MessageType.selectedObjective, receiveOwn?: boolean): [FriendlyRobot, ReceivedData<MessageType.selectedObjective>] | [];
		/**
		 * Retrieve a single sender message.
		 * @param type - Which message to receive
		 * @param receiveOwn - Whether to receive messages sent by this message box
		 * @returns the message along with its sender or an empty tuple if the message wasn't sent
		 */
		public receiveSingleSender<M extends ReceiveSingleSender>(type: M, receiveOwn?: boolean): ReadonlyRec<[FriendlyRobot, ReceivedData<M>] | []>;
		public receiveSingleSender<M extends ReceiveSingleSender>(type: M, receiveOwn?: boolean): ReadonlyRec<[FriendlyRobot, ReceivedData<M>] | []> {
			const map = this.receiveGeneric(type, receiveOwn);
			if (map.size > 1) {
				throw new Error(`Single sender message ${MessageType[type]} sent by ${map.size} robots!`);
			}
			const it = head(map);
			return it
			? it as ReadonlyRec<[FriendlyRobot, any]>
			: [];
		}

		/**
		 * Retrieve a repeated message.
		 * @param param - Which message to receive
		 * @param receiveOwn - Whether to receive messages sent by this message box
		 * @returns the messages of this type sent to this box along with their sender
		 */
		public receiveRepeated<M extends ReceiveRepeated>(type: M, receiveOwn?: boolean): ReadonlyRec<Map<FriendlyRobot, ReceivedData<M>>> {
			return this.receiveGeneric(type, receiveOwn) as ReadonlyRec<Map<FriendlyRobot, ReceivedData<M>>>;
		}

		/**
		 * Retrieve a message sent by the trainer.
		 * @param type - Which message to receive
		 * @param receiveOwn - Whether to receive messages sent by this message box (only sensible for the trainer)
		 * @returns the message of this type or undefined if it wasn't sent
		 */
		public receiveTrainer<M extends ReceiveTrainer>(type: M, receiveOwn?: boolean): ReadonlyRec<ReceivedData<M> | undefined> {
			return this.receiveGeneric(type, receiveOwn).get("trainer");
		}

		/**
		 * Retrieve a repeated message sent by the trainer.
		 * @param type - Which message to receive
		 * @param receiveOwn - Whether to receive messages sent by this message box (only sensible for the trainer)
		 * @returns the messages of this type or undefined if it wasn't sent
		 */
		public receiveTrainerRepeated<M extends ReceiveTrainerRepeated>(type: M, receiveOwn?: boolean): ReadonlyRec<ReceivedData<M> | undefined> {
			return this.receiveGeneric(type, receiveOwn).get("trainer");
		}

		public receiveGeneric<M extends MessageType>(type: M, receiveOwn?: boolean): ReadonlyRec<Map<MessageOrigin, ReceivedData<M>>> {
			let mtypeBox = this._messaging._deliveredMessages[type];
			if (this._origin === "trainer") {
				mtypeBox = this._messaging._newMessages[type];
			}
			if (mtypeBox == undefined) {
				return emptyMap;
			}
			// returns all messages of "type" which were sent to "all"
			if (receiveOwn) {
				if (mtypeBox.get("all") == undefined) {
					return emptyMap;
				}
				return mtypeBox.get("all");
			}
			let receiveBox = mtypeBox.get(this._origin);
			let allBox: Map<MessageOrigin, any> | undefined = mtypeBox.get("all");
			if (receiveBox == undefined && allBox == undefined) {
				return emptyMap;
			} else {
				if (receiveBox == undefined) {
					receiveBox = new Map<FriendlyRobot, any>();
					mtypeBox.set(this._origin, receiveBox);
				}
				if (allBox) {
					let allMerged = mtypeBox.get("allBoxMerged");
					if (allMerged == undefined) {
						allMerged = new Map();
						mtypeBox.set("allBoxMerged", allMerged);
					}
					if (allMerged.get(this._origin) == undefined) { // merge broadcasts into receiveBox
						let receiverRobot = (this._origin === "trainer") ? "trainer" : this._origin;
						for (let sender of allBox.keys()) {
							let data = allBox.get(sender);
							if (sender !== receiverRobot || this._origin === "trainer") {
								receiveBox.set(sender, data);
							}
						}
						allMerged.set(this._origin, true);
					}
				}

				return receiveBox;
			}
		}

		public receiveNoBroadcast<M extends MessageType>(type: M): ReadonlyRec<Map<MessageOrigin, ReceivedData<M>>> {
			let mtypeBox = this._messaging._deliveredMessages[type];
			if (this._origin === "trainer") {
				mtypeBox = this._messaging._newMessages[type];
			}
			if (mtypeBox == undefined) {
				return emptyMap;
			}
			let receiveBox = mtypeBox.get(this._origin);
			if (receiveBox == undefined) {
				return emptyMap;
			} else {
				return receiveBox;
			}
		}

		public receiveAllInbox<M extends MessageType>(type: M): ReadonlyRec<Map<MessageOrigin, ReceivedData<M>>> {
			let mtypeBox = this._messaging._deliveredMessages[type];
			if (this._origin === "trainer") {
				mtypeBox = this._messaging._newMessages[type];
			}
			if (mtypeBox == undefined) {
				return emptyMap;
			}
			if (mtypeBox.get("all") == undefined) {
				return emptyMap;
			}
			return mtypeBox.get("all");
		}

		public cancel<M extends MessageType>(type: M): void {
		/* Most of the time, it probably is a bad idea to cancel messages, so
		 * we restrict this ability a bit. It is most sensical for the trainer
		 * to be able to do this, since it is an overseer. The same can't be
		 * said for normal agents.
		 */
			if (this._origin !== "trainer") {
				throw new Error("Only the trainer is allowed to cancel messages");
			}

			this._messaging._newMessages[type]?.clear();
		}
	};

	private _newMessages: { [type: number]: Map<MessageOrigin | "all" | "allBoxMerged", any | any[]> } = {}; // is reset every frame
	private _deliveredMessages: { [type: number]: Map<MessageOrigin | "all" | "allBoxMerged", any | any[]> } = {}; // reference to the newMessages table of the last last frame
	// messages are stored in the following format:
	// messages = {
	// 	messageTypeA = {
	// 		Agent1 = { senderRobot1 = data, senderRobot2 = data}, ...
	// 	},
	// 	messageTypeB = { Agent3 = { senderRobot4 = data} }
	// }
	private _robotToAgent: Map<FriendlyRobot, AgentLike> = new Map<FriendlyRobot, AgentLike>();
	private _trainerRegistered = false;

	public registerAgent(agent: AgentLike): MessageBox {
		this._robotToAgent.set(agent.robot(), agent);
		return new Messaging.MessageBox(this, agent.robot());
	}

	public registerTrainer(): MessageBox {
		if (this._trainerRegistered) {
			throw new Error("trainer is already registered!");
		}
		this._trainerRegistered = true;
		return new Messaging.MessageBox(this, "trainer");
	}

	// this method should be called once every frame
	public deliverMessages() {
		this._deliveredMessages = this._newMessages;
		this._newMessages = {};
	}
}

/**
 * Display received messages in the debug tree. If a message contains a
 * timestamp, this function will display both the original absolute time and a
 * relative time.
 * @param type - The type of the message. Used to determine special cases and the message name
 * @param messages - The messages to dump along with their sender
 */
export function dumpMessages<M extends MessageType>(type: M, messages: ReadonlyRec<Map<MessageOrigin, ReceivedData<M>>>): void {
	if (messages.size === 0) {
		return;
	}
	const name = MessageType[type];
	debug.push(name);

	const specialDumpFunction = DUMP_MESSAGES_SPECIAL_CASES[type];
	for (const [sender, msg] of messages.entries()) {
		const indexValue = sender === "trainer" ? sender : sender.id.toString();
		if (specialDumpFunction) {
			specialDumpFunction(indexValue, msg as never);
		} else {
			debug.set(indexValue, msg);
		}
	}
	debug.pop(); // name
}

type MessageDumper<M extends MessageType> = { [k in M]: (senderName: string, msg: ReceivedData<M>) => void };

/** Needed to distribute MessageDumper over all MessageTypes */
type MessageDumperHelper<M extends MessageType> = M extends any ? MessageDumper<M> : never;

type AllMessageDumper = UnionToIntersection<MessageDumperHelper<MessageType>>;

const DUMP_MESSAGES_SPECIAL_CASES: Partial<AllMessageDumper> = {
	[MessageType.centerBackPosTarget]: dumpWithTimeSubkey,
	[MessageType.earliestAttackTime]: dumpTimeMessage,
	[MessageType.exclusiveRole]: dumpExclusiveRole,
	[MessageType.passInfo]: dumpArrayWithTimeSubkey,
	[MessageType.passSuggestion]: dumpWithTimeSubkey,
	[MessageType.plannedAttackTime]: dumpTimeMessage,
	[MessageType.roleAssignment]: dumpRoleAssignment,
	[MessageType.supportSamplingTimestamp]: dumpTimeMessage,
	[MessageType.groupApplication]: dumpGroupApplication,
};

function dumpGroupApplication(senderName: string, msg: ReadonlyRec<ReceivedData<MessageType.groupApplication>>) {
	debug.push(senderName);
	for (const { name, payload } of msg) {
		debug.set(name, payload);
	}
	debug.pop(); // senderName
}

function dumpExclusiveRole(senderName: string, msg: ReadonlyRec<ReceivedData<MessageType.exclusiveRole>>) {
	debug.push(senderName);
	for (const [role, rating] of msg) {
		debug.set(MessageType[role], rating);
	}
	debug.pop(); // senderName
}

function dumpRoleAssignment(senderName: string, msg: ReadonlyRec<ReceivedData<MessageType.roleAssignment>>) {
	debug.set(senderName, msg.params);
	if (msg.name === "CenterBack" && msg.params.time !== undefined) {
		debug.set(`${senderName}/time`, formatTimestamp(msg.params.time));
	}
	// Replace "Object"/"Array" tree value with role name
	debug.set(senderName, msg.name);
}

function dumpTimeMessage(senderName: string, msg: number) {
	debug.set(senderName, formatTimestamp(msg));
}

function dumpArrayWithTimeSubkey(senderName: string, msg: ReadonlyRec<{ time?: number }[]>) {
	debug.push(senderName);
	for (let i = 0; i < msg.length; ++i) {
		dumpWithTimeSubkey(i.toString(), msg[i]);
	}
	debug.pop(); // senderName
}

/**
 * Dumps the given object where `msg.time` is output as a string that
 * contains both relative and absolute timestamps
 */
function dumpWithTimeSubkey(senderName: string, msg: ReadonlyRec<{ time?: number }>) {
	debug.set(senderName, msg);
	if (msg.time !== undefined) {
		debug.set(`${senderName}/time`, formatTimestamp(msg.time));
	}
}

export function formatTimestamp(absTime: AbsTime): string {
	const relTime = absTime - World.Time;
	return `${relTime.toFixed(4)} (${absTime.toFixed(0)})`;
}
