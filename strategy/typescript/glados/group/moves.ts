import * as debug from "base/debug";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Armada } from "glados/group/move/armada";
import { BallPlacement } from "glados/group/move/ballplacement";
import { Move } from "glados/group/move/base";
import { CrossShoot } from "glados/group/move/crossshoot";
import { KickOff } from "glados/group/move/kickoff";
import { KickOffDefensive } from "glados/group/move/kickoffdefensive";
import { MrlTestCorner } from "glados/group/move/mrltestcorner";
import { None } from "glados/group/move/none";
import { WindshieldWiper } from "glados/group/move/windshieldwiper";
import { Group } from "glados/trainer/groups";
// import {OverChip} from "glados/group/move/overchip";

export interface Assignment {
	behavior?: any;
	class?: any;
	/** The parameters used to construct class or behavior */
	params: any;
	restart: boolean;
	mainAttacker: boolean;
}

export interface MoveInfo {
	attackers: (number | undefined)[];
	allowExtraAttackers: boolean;
}

export class Moves implements Group {
	public readonly name = "moves";
	private moveList: typeof Move[];
	private _numAttackersSent: boolean = false;
	private _chosenMove: undefined | {
		ctor: typeof Move;
		requestedRobots: number;
	};
	private _currentMove: Move | undefined;
	private _participatingRobots: FriendlyRobot[] = [];

	public constructor(moveList?: typeof Move[]) {
		this.moveList = moveList ?? [
			KickOff,
			KickOffDefensive,
			MrlTestCorner,
			Armada,
			BallPlacement,
			WindshieldWiper,
			CrossShoot,
			None
		];

		for (let move of this.moveList) {
			if (move.MIN_ROBOTS > move.MAX_ROBOTS) {
				throw new Error("Move: MIN_ROBOTS can't be greater than MAX_ROBOTS!");
			}
			if (move.MIN_ROBOTS < 0) {
				throw new Error("Move: MIN_ROBOTS must be greater than or equal to 0!");
			}
		}
	}

	public run(messaging: MessageBox, messages: Map<FriendlyRobot, undefined>) {
		// check if all participating robots are still available
		if (this._currentMove) {
			for (let r of this._participatingRobots) {
				if (!messages.has(r)) {
					this._currentMove = undefined;
					this._chosenMove = undefined;
					this._numAttackersSent = false;
					break;
				}
			}
		}

		// check if current move can be continued
		if (this._currentMove && !this._currentMove.canContinue()) {
			this._currentMove = undefined;
			this._chosenMove = undefined;
			this._numAttackersSent = false;
		}

		let n_attackers;
		let attackers: (undefined | number)[];
		// choose a new move
		if (this._chosenMove == undefined) {
			let candidates = [];
			let numCandidateRobots = 0;
			numCandidateRobots += messaging.receive(MessageType.attackerFlag).size;
			numCandidateRobots += messaging.receive(MessageType.defenderFlag).size;
			for (let move of this.moveList) {
				if (numCandidateRobots >= move.MIN_ROBOTS && move.canStart(numCandidateRobots)) {
					candidates.push(move);
				}
			}

			if (candidates.length > 0) {
				let index = MathUtil.randomInt([0, candidates.length - 1]);
				const chosenMove = candidates[index];
				n_attackers = Math.min(numCandidateRobots, chosenMove.wantedMaxRobots(numCandidateRobots));
				attackers = [];
				attackers.length = n_attackers;

				this._chosenMove = {
					ctor: chosenMove,
					requestedRobots: n_attackers,
				};
			}
		}

		if (this._currentMove == undefined && this._chosenMove != undefined) {
			const availableRobots = [...messages.keys()];

			if (availableRobots.length >= this._chosenMove.ctor.MIN_ROBOTS
					&& this._numAttackersSent) {
				availableRobots.sort((a, b) => b.pos.y - a.pos.y);
				const numAssigned = Math.min(
					availableRobots.length,
					this._chosenMove.requestedRobots,
				);
				this._participatingRobots = availableRobots.slice(0, numAssigned);
				this._currentMove = new (this._chosenMove.ctor as any)(this._participatingRobots, messaging);
			}
		}


		// reset participating robots
		let prevParticipatingRobots = this._participatingRobots;
		this._participatingRobots = [];

		// run
		if (this._currentMove) {
			debug.push("Move");
			let moveParams = this._currentMove.updateTasks();
			for (let robot of prevParticipatingRobots) {
				let assignment: any = moveParams.assignments.get(robot);
				if (assignment != undefined) {
					assignment.mainAttacker = robot === moveParams.mainAttacker;
					if ((assignment.class != undefined && assignment.class !== "none") || assignment.behavior != undefined) {
						messaging.send(MessageType.moveAssignment, robot, assignment);
					}
					this._participatingRobots.push(robot);
				} else {
					messaging.sendToTrainerRepeated(MessageType.forcePoolChange, { robot: robot, destPool: "defender" });
				}
			}
			attackers = this._participatingRobots.map((x) => x.id);
			n_attackers = attackers.length;
			debug.pop();
		}

		if (this._chosenMove && n_attackers != undefined) {
			this._numAttackersSent = true;
			messaging.sendBroadcast(MessageType.moveInfo, {
				attackers: attackers!,
				allowExtraAttackers: this._chosenMove.ctor.ALLOW_EXTRA_ATTACKERS
			});
		}

		debug.push("Move");
		debug.set("ParticipatingRobots", this._participatingRobots);
		if (this._currentMove) {
			debug.set(undefined, this._currentMove.constructor.name);
		}
		debug.pop();
	}
}
