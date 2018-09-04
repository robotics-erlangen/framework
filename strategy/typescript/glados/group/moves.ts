import * as debug from "base/debug";
import * as MathUtil from "base/mathutil";
import {FriendlyRobot} from "base/robot";

import {MessageBox, MessageType} from "glados/control/messaging";
import {Move, Assignment} from "glados/group/move/base";

import {KickOff} from "glados/group/move/kickoff";
import {KickOffDefensive} from "glados/group/move/kickoffdefensive";
import {MrlTestCorner} from "glados/group/move/mrltestcorner";
import {Armada} from "glados/group/move/armada";
import {FastBallPlacement} from "glados/group/move/ballplacement";
// import {OverChip} from "glados/group/move/overchip";
import {WindshieldWiper} from "glados/group/move/windshieldwiper";
import {None} from "glados/group/move/none";

function sortById(a: {id: number}, b: {id: number}): number {
	return a.id - b.id;
}

export class Moves {
	readonly name: string = "moves";
	moveList: typeof Move[];
	_numAttackersSent: boolean = false;
	_chosenMove: typeof Move | undefined;
	_currentMove: Move | undefined;
	_participatingRobots: FriendlyRobot[] = [];

	constructor () {
		this.moveList = [
			KickOff,
			KickOffDefensive,
			MrlTestCorner,
			Armada,
			FastBallPlacement,
			WindshieldWiper,
			None
		];

		for (let move of this.moveList) {
			if (move.MIN_ROBOTS > move.MAX_ROBOTS) {
				throw new Error("Move: MIN_ROBOTS can't be greater than MAX_ROBOTS!");
			}
			if (move.MIN_ROBOTS < 1) {
				throw new Error("Move: MIN_ROBOTS must be greater than 0!");
			}
		}
	}

	run (messaging: MessageBox, messages: Map<FriendlyRobot, any>) {
		// check if all participating robots are still available
		if (this._currentMove) {
			for (let r of this._participatingRobots) {
				if (!messages.has(r)) {
					this._currentMove = undefined
					this._chosenMove = undefined
					break
				}
			}
		}

		// check if current move can be continued
		if (this._currentMove && !this._currentMove._canContinue()) {
			this._currentMove = undefined
			this._chosenMove = undefined
			this._numAttackersSent = false
		}

		let n_attackers
		// choose a new move
		if (this._chosenMove == undefined) {
			let candidates = []
			let numCandidateRobots = 0;
			numCandidateRobots += messaging.receive(MessageType.attackerFlag).size;
			numCandidateRobots += messaging.receive(MessageType.defenderFlag).size;
			for (let move of this.moveList) {
				if (move.canStart()) {
					if (numCandidateRobots >= move.MIN_ROBOTS) {
						candidates.push(move)
					}
				}
			}

			if (candidates.length > 0) {
				let index = MathUtil.randomInt([0,candidates.length-1]);
				this._chosenMove = candidates[index]
				n_attackers = Math.min(numCandidateRobots, candidates[index].MAX_ROBOTS)
			}
		}

		if (this._currentMove == undefined && this._chosenMove != undefined) {
			let availableRobots = []
			for (let r of messages.keys()) {
				availableRobots.push(r)
			}

			if (availableRobots.length >= this._chosenMove.MIN_ROBOTS  &&
					availableRobots.length <= this._chosenMove.MAX_ROBOTS  &&
					this._numAttackersSent) {
				availableRobots.sort(sortById);
				this._currentMove = new (this._chosenMove as any)(availableRobots, messaging)
				this._participatingRobots = availableRobots
			}
		}


		// reset participating robots
		let prevParticipatingRobots = this._participatingRobots
		this._participatingRobots = []

		// run
		if (this._currentMove) {
			debug.push("Move")
			let [taskAssignments, mainAttacker] = this._currentMove.updateTasks()
			for (let robot of prevParticipatingRobots) {
				let assignment: any = taskAssignments.get(robot);
				if (assignment != undefined) {
					assignment.mainAttacker = robot == mainAttacker
					if (assignment.class != undefined && assignment.class != "none") {
						messaging.send(MessageType.moveAssignment, robot, assignment);
					}
					this._participatingRobots.push(robot)
				} else {
					messaging.sendToTrainerRepeated(MessageType.forcePoolChange, { robot: robot, destPool: "defender" });
				}
			}
			n_attackers = this._participatingRobots.length
			debug.pop()
		}

		if (this._chosenMove && n_attackers) {
			if (n_attackers == undefined || n_attackers == 0) {
				throw new Error();
			}
			this._numAttackersSent = true
			messaging.sendToTrainer(MessageType.moveNumAttackers, n_attackers);
		}

		debug.push("Move")
		debug.set("ParticipatingRobots", this._participatingRobots)
		if (this._currentMove) {
			debug.set(undefined, this._currentMove.constructor.name)
		}
		debug.pop()
	}
}
