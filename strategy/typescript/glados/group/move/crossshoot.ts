import * as geom from "base/geom";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { isShot } from "glados/observer/ball";
import { StopAttack } from "glados/task/attacker/stopattack";
import { ChipToPos } from "glados/task/shared/chiptopos";
import { MoveToPos } from "glados/task/shared/movetopos";
import { valueToRating } from "glados/util/rating";
const G = World.Geometry;



const FIRST_CONTACT_POS_OFFSET_X: number = (1 / 12) * G.DefenseWidth;
const FIRST_CONTACT_POS_OFFSET_Y: number = (4 / 12) * G.DefenseHeight; // 0.1;
const CONTACT_POS_OFFSET: number = (1 / 12) * G.DefenseHeight;
const RECIEVER_POS_Y: number = (2 / 5) * G.DefenseHeight;
// move stops before the ball arrives the attacker
const MOVE_TIME_MAX: number = 1.5;
const START_POS_WALL: number = 0.4;
const WALL_SPACE: number = 0.45;
const CORNER_KICK_POS_Y: number = G.OpponentGoal.y - 0.2;
const GOAL_KICK_POS_Y: number = G.OpponentGoal.y - 1;


export class CrossShoot extends Move {
	public static readonly MIN_ROBOTS: number = 6;
	public static readonly MAX_ROBOTS: number = 6;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;
	private pos: Vector[] = [];
	private timeBegin: number | undefined = undefined;
	private waitTwoSeconds: number | undefined = undefined;
	private restart: boolean = true;

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
	}
	static canStart() {
		// _canContinue must not fail during freekick state if this move is to be allowed to start in freekick state
		// - don't waste time by restarting different moves
		return G.FieldHeightHalf - (2 / 3) * G.DefenseHeight < World.Ball.pos.y
			&& G.DefenseWidthHalf + (1 / 4) * G.DefenseWidthHalf < Math.abs(World.Ball.pos.x)
			&& (World.RefereeState === "Stop" && CrossShoot.Referee.opponentTouchedLast()
				|| CrossShoot.Referee.isFriendlyFreeKickState());
	}

	_canContinue() {
		if (Referee.isGameState()) {
			if (this.timeBegin == undefined) {
				this.timeBegin = World.Time;
			}
			return !(isShot() || ((World.Time - this.timeBegin) > MOVE_TIME_MAX));
		} else {
			if (CrossShoot.Referee.isFriendlyFreeKickState()) {
				return true;
			}
			return G.FieldHeightHalf - (2 / 3) * G.DefenseHeight - 0.2 < World.Ball.pos.y
				&& G.DefenseWidthHalf + (1 / 4) * G.DefenseWidthHalf - 0.1 < Math.abs(World.Ball.pos.x)
				&& World.RefereeState === "Stop";
		}
	}

	private calculateFirstContactPosY(start: Vector, end: Vector, alpha: number): Vector {
		return new Vector(start.x, start.y - alpha * (start.y - end.y));
	}
	private calculateFirstContactPosX(start: Vector, end: Vector, beta: number): Vector {
		return new Vector(start.x - beta * (start.x - end.x), start.y);
	}

	_updateTasks(): MoveParameters {
		let startContactPosY = new Vector(Math.sign(World.Ball.pos.x) * G.DefenseWidthHalf -
			Math.sign(World.Ball.pos.x) * FIRST_CONTACT_POS_OFFSET_X, G.OpponentGoal.y - G.DefenseHeight + FIRST_CONTACT_POS_OFFSET_Y);
		let endContactPosY = new Vector(Math.sign(World.Ball.pos.x) * G.DefenseWidthHalf -
			Math.sign(World.Ball.pos.x) * FIRST_CONTACT_POS_OFFSET_X, G.OpponentGoal.y - G.DefenseHeight + CONTACT_POS_OFFSET);
		let alpha = valueToRating(World.Ball.pos.y, CORNER_KICK_POS_Y, GOAL_KICK_POS_Y);
		let startContactPosX = new Vector(Math.sign(World.Ball.pos.x) * G.DefenseWidthHalf -
			Math.sign(World.Ball.pos.x) * FIRST_CONTACT_POS_OFFSET_X, G.OpponentGoal.y - G.DefenseHeight + CONTACT_POS_OFFSET);
		let endContactPosX = new Vector(Math.sign(World.Ball.pos.x) * G.DefenseWidthHalf -
			Math.sign(World.Ball.pos.x) * FIRST_CONTACT_POS_OFFSET_X - Math.sign(World.Ball.pos.x) * G.DefenseWidthHalf / 3, G.OpponentGoal.y - G.DefenseHeight + CONTACT_POS_OFFSET);
		let beta = valueToRating(Math.abs(World.Ball.pos.x), G.FieldWidthHalf, G.FieldWidthHalf - (G.DefenseWidthHalf + (1 / 4) * G.DefenseWidthHalf));

		let firstContactPosY = this.calculateFirstContactPosY(startContactPosY, endContactPosY, alpha);
		let firstContactPosX = this.calculateFirstContactPosX(startContactPosX, endContactPosX, beta);
		let firstContactPos = firstContactPosY + 0.5 * (firstContactPosX - firstContactPosY);
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
		taskAssignments[this._robots[5]] = Assignment.create({ class: MoveToPos, params: [{ pos: receiverPos[0]! }], restart: this.restart });

		if (World.RefereeState === "Stop") {
			taskAssignments[this._robots[0]] = Assignment.create({ class: StopAttack, params: [] });
		} else if (Referee.isFriendlyFreeKickState()) {
			if (this.waitTwoSeconds === undefined) {
				this.restart = false;
				this.waitTwoSeconds = World.Time;
			}
			if (World.Time - this.waitTwoSeconds > 2) {
				taskAssignments[this._robots[0]] = Assignment.create({ class: ChipToPos, params: [firstContactPos, World.Time] });
			} else {
				taskAssignments[this._robots[0]] = Assignment.create({ class: StopAttack, params: [] });
			}
		}
		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}
}

