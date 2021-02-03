import * as geom from "base/geom";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { StopAttack } from "glados/task/attacker/stopattack";
import { ChipToPos } from "glados/task/shared/chiptopos";
import { MoveToPos } from "glados/task/shared/movetopos";
import { valueToRating } from "glados/util/rating";
let G = World.Geometry;



const FIRST_CONTACT_POS_OFFSET_X: number = 0.2;
const FIRST_CONTACT_POS_OFFSET_y: number = 0.1;
// move stops before the ball arrives the attacker
const DISTANCE_TO_BALL: number = 0.7;
const MOVE_TIME_MAX: number = 1.5;
const RECIEVER_POS_Y: number = 0.7;
const START_POS_WALL: number = 0.4;
const WALL_SPACE: number = 0.45;
const CONTACT_POS_OFFSET: number = 0.4;
const CORNER_KICK_POS_Y: number = G.OpponentGoal.y - 0.2;
const GOAL_KICK_POS_Y: number = G.OpponentGoal.y - 1;


export class CrossShoot extends Move {
	public static MIN_ROBOTS: number = 6;
	public static MAX_ROBOTS: number = 6;
	public static ALLOW_EXTRA_ATTACKERS = false;
	private pos: Vector[] = [];
	private timeBegin: number | undefined = undefined;



	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
	}
	static canStart() {
		return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5
			&& Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
			&& World.RefereeState === "Stop" && CrossShoot.Referee.opponentTouchedLast();

	}

	_canContinue() {
		if (Referee.isGameState()) {
			if (this.timeBegin == undefined) {
				this.timeBegin = World.Time;
			}
			return !(World.Ball.pos.distanceTo(this._robots[5].pos) < DISTANCE_TO_BALL || ((World.Time - this.timeBegin) > MOVE_TIME_MAX));
		} else {
			if (CrossShoot.Referee.isFriendlyFreeKickState()) {
				return true;
			}
			return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
				&& Math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
				&& World.RefereeState === "Stop";
		}
	}
	calculateFirstContactPos(start: Vector, end: Vector, alpha: number): Vector {
		return new Vector(start.x, start.y - alpha * (start.y - end.y));

	}

	_updateTasks(): MoveParameters {
		let startContactPos = new Vector(Math.sign(World.Ball.pos.x) * G.DefenseWidthHalf -
			Math.sign(World.Ball.pos.x) * FIRST_CONTACT_POS_OFFSET_X, G.OpponentGoal.y - G.DefenseHeight + FIRST_CONTACT_POS_OFFSET_y);
		let endContactPos = new Vector(Math.sign(World.Ball.pos.x) * G.DefenseWidthHalf -
			Math.sign(World.Ball.pos.x) * FIRST_CONTACT_POS_OFFSET_X, G.OpponentGoal.y - G.DefenseHeight + FIRST_CONTACT_POS_OFFSET_y - CONTACT_POS_OFFSET);
		let alpha = valueToRating(World.Ball.pos.y, CORNER_KICK_POS_Y, GOAL_KICK_POS_Y);
		let firstContactPos = this.calculateFirstContactPos(startContactPos, endContactPos, alpha);

		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		let receiverPos = geom.intersectLineLine(World.Ball.pos, firstContactPos - World.Ball.pos,
			new Vector(G.DefenseWidthHalf, G.OpponentGoal.y - G.DefenseHeight - RECIEVER_POS_Y), new Vector(1, 0));

		for (let i = 0; i < 4; i++) {
			this.pos[i] = new Vector(Math.sign(World.Ball.pos.x) * (G.DefenseWidthHalf + START_POS_WALL + i * WALL_SPACE),
				G.OpponentGoal.y - G.DefenseHeight);
		}
		for (let i = 0; i < this.pos.length; i++) {
			taskAssignments[this._robots[i + 1]] = Assignment.create({ class: MoveToPos, params: [{ pos: this.pos[i] }] });
		}

		taskAssignments[this._robots[5]] = Assignment.create({ class: MoveToPos, params: [{ pos: receiverPos[0]! }] });

		if (World.RefereeState === "Stop") {
			taskAssignments[this._robots[0]] = Assignment.create({ class: StopAttack, params: [] });
		} else if (Referee.isFriendlyFreeKickState()) {
			taskAssignments[this._robots[0]] = Assignment.create({ class: ChipToPos, params: [firstContactPos, World.Time] });
		}
		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}
}

