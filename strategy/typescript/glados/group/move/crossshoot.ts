import * as geom from "base/geom";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, MoveParameters } from "glados/group/move/base";
import { FixedMAMove } from "glados/group/move/fixedmamove";
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


export class CrossShoot extends FixedMAMove {
	public static readonly MIN_ROBOTS: number = 6;
	public static readonly MAX_ROBOTS: number = 6;

	private _pos: Vector[] = [];
	private _timeBegin: number | undefined = undefined;
	private _waitTwoSeconds: number | undefined = undefined;
	private _restart: boolean = true;
	private _firstContactPos: Position;
	private _receiverPos: Position;

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		[this._firstContactPos, this._receiverPos] = CrossShoot._computeFirstContactAndReceiverPos();
	}

	private static _computeFirstContactAndReceiverPos(): [Position, Position] {
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

		let _firstContactPosY = CrossShoot._calculateFirstContactPosY(startContactPosY, endContactPosY, alpha);
		let _firstContactPosX = CrossShoot._calculateFirstContactPosX(startContactPosX, endContactPosX, beta);
		let _firstContactPos = _firstContactPosY + 0.5 * (_firstContactPosX - _firstContactPosY);
		let _receiverPos = geom.intersectLineLine(World.Ball.pos, _firstContactPos - World.Ball.pos,
			new Vector(G.DefenseWidthHalf, G.OpponentGoal.y - G.DefenseHeight - RECIEVER_POS_Y), new Vector(1, 0))[0]!;
		return [_firstContactPos, _receiverPos];
	}

	public static canStart() {
		// _canContinue must not fail during freekick state if this move is to be allowed to start in freekick state
		// - don't waste time by restarting different moves
		return G.FieldHeightHalf - (2 / 3) * G.DefenseHeight < World.Ball.pos.y
			&& G.DefenseWidthHalf + (1 / 4) * G.DefenseWidthHalf < Math.abs(World.Ball.pos.x)
			&& (World.RefereeState === "Stop" && CrossShoot.Referee.opponentTouchedLast()
				|| CrossShoot.Referee.isFriendlyFreeKickState());
	}

	public canContinue(): boolean {
		if (CrossShoot.Referee.isGameState()) {
			if (this._timeBegin == undefined) {
				this._timeBegin = World.Time;
			}
			return !(isShot() || ((World.Time - this._timeBegin) > MOVE_TIME_MAX));
		} else {
			if (CrossShoot.Referee.isFriendlyFreeKickState()) {
				return true;
			}
			return G.FieldHeightHalf - (2 / 3) * G.DefenseHeight - 0.2 < World.Ball.pos.y
				&& G.DefenseWidthHalf + (1 / 4) * G.DefenseWidthHalf - 0.1 < Math.abs(World.Ball.pos.x)
				&& World.RefereeState === "Stop";
		}
	}

	private static _calculateFirstContactPosY(start: Vector, end: Vector, alpha: number): Vector {
		return new Vector(start.x, start.y - alpha * (start.y - end.y));
	}

	private static _calculateFirstContactPosX(start: Vector, end: Vector, beta: number): Vector {
		return new Vector(start.x - beta * (start.x - end.x), start.y);
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		for (let i = 0; i < 4; i++) {
			this._pos[i] = new Vector(Math.sign(World.Ball.pos.x) * (G.DefenseWidthHalf + START_POS_WALL + i * WALL_SPACE),
				G.OpponentGoal.y - G.DefenseHeight);
		}
		for (let i = 0; i < this._pos.length; i++) {
			taskAssignments[this._robots[i + 1]] = Assignment.create({ class: MoveToPos, params: [{ pos: this._pos[i] }] });
		}
		taskAssignments[this._robots[5]] = Assignment.create({ class: MoveToPos, params: [{ pos: this._receiverPos }], restart: this._restart });

		if (World.RefereeState === "Stop") {
			taskAssignments[this._robots[0]] = Assignment.create({ class: StopAttack, params: [] });
		} else if (Referee.isFriendlyFreeKickState()) {
			if (this._waitTwoSeconds === undefined) {
				this._restart = false;
				this._waitTwoSeconds = World.Time;
			}
			if (World.Time - this._waitTwoSeconds > 2) {
				taskAssignments[this._robots[0]] = Assignment.create({ class: ChipToPos, params: [this._firstContactPos, World.Time] });
			} else {
				taskAssignments[this._robots[0]] = Assignment.create({ class: StopAttack, params: [] });
			}
		}
		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}

	public static sortRobotsByPriority(robots: FriendlyRobot[]): FriendlyRobot[] {
		const _receiverPos = CrossShoot._computeFirstContactAndReceiverPos()[1];
		const localSort = (robots: FriendlyRobot[]): FriendlyRobot[] => {
			// search robot with closest distance to receive pos
			const robotsWithDistancesToReceivePos: [FriendlyRobot, number][] = robots.map((robot) => [robot, robot.pos.distanceTo(_receiverPos)]);
			robotsWithDistancesToReceivePos.sort((robotA, robotB) => robotA[1] - robotB[1]);
			const receiverBot = robotsWithDistancesToReceivePos[0][0];
			const receiverBotIndex = robots.indexOf(receiverBot);
			robots.splice(receiverBotIndex, 1);

			// sort rest of robots according to their distance to the ball
			const robotsWithDistancesToBall: [FriendlyRobot, number][] = robots.map((robot) => [robot, robot.pos.distanceTo(World.Ball.pos)]);
			robotsWithDistancesToBall.sort((robotA, robotB) => robotA[1] - robotB[1]);
			robots = robotsWithDistancesToBall.map(([robot, _distance]) => robot);

			// - 2, because it's index 5 in the original array, but localSort gets array without MA, so it needs to be offset by 2
			robots.splice(CrossShoot.MAX_ROBOTS - 2, 0, receiverBot);

			return robots;
		};

		return FixedMAMove._sortRobotsByPriorityMAFirst(robots, localSort);
	}
}

