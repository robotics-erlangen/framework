import * as Field from "base/field";
import * as geom from "base/geom";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import { ForceShoot } from "glados/task/ability/forceshoot";
import { Agent, Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";


const POSITION_PADDING = 0.02; // safety distance

const CHIP_IMPACT_DIST_FROM_BORDER = 0.5;
const CHIP_DIST_FACTOR = 0.25;
const CHIP_GOAL_LINE_DIST = 1;

const leftFriendlyCorner = new Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf);
const rightFriendlyCorner = new Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf);

// assume chips crossing this line might cross the goal line
let leftNearBasePoint = new Vector(-World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf - CHIP_GOAL_LINE_DIST);
let rightNearBasePoint = new Vector(World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf - CHIP_GOAL_LINE_DIST);
let nearBaseLineDir = rightNearBasePoint - leftNearBasePoint;

export class AggressiveKeeper extends Task {
	private _forceShoot: ForceShoot;

	constructor(agent: Agent) {
		super(agent);
		this._forceShoot = new ForceShoot(this._robot);
	}

	run() {
		const MAX_DIST_TO_DEFENSE_AREA = 0.3;

		let safeGoalMid = World.Geometry.FriendlyGoal - new Vector(0, 0.05);
		let moveDest;
		let ignoreBall;
		if (World.Ball.pos.y < this._robot.pos.y + POSITION_PADDING) {
			// get between ball and goal
			let ballDist = this._robot.radius + World.Ball.radius;
			moveDest = World.Ball.pos + (safeGoalMid - World.Ball.pos).setLength(ballDist) + new Vector(0, -POSITION_PADDING);
			ignoreBall = false;
		} else {
			let ballTime = Robot.minTimeToBall(this._robot);
			moveDest = Physics.ballAtTime(World.Ball, ballTime).pos;
			moveDest = moveDest + (this._robot.pos - moveDest).setLength(World.Ball.radius);
			ignoreBall = true;
		}

		this._chipToBorderIfSafe();

		let ignoreFriendlyRobots = false;
		if (Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius) < MAX_DIST_TO_DEFENSE_AREA) {
			ignoreFriendlyRobots = true;
		}
		let obstacleTable = {
			ignoreBall: ignoreBall,
			ignorePass: true,
			ignoreFriendlyRobots: ignoreFriendlyRobots,
			disableOpponentPrediction: true,
			messaging: this._messaging
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		let viewDir = World.Ball.pos - safeGoalMid;
		this._robot.trajectory.update(CurvedMaxAccel, moveDest, viewDir.angle(), undefined, viewDir * 0.5);
	}

	_chipToBorderIfSafe() {
		let robotPos = this._robot.pos;
		let ballPos = World.Ball.pos;
		let robotDir = ballPos - robotPos;
		let viewAngle = robotDir.angle();
		let rigthCornerAngle = (rightFriendlyCorner - robotPos).angle();
		let leftCornerAngle = (leftFriendlyCorner - robotPos).angle();
		if (viewAngle > rigthCornerAngle || viewAngle < leftCornerAngle) { // not towards own goal line
			let touchLineIntersection = Field.nextLineCut(robotPos, robotDir);
			let chipPos = geom.intersectLineLine(robotPos, robotDir, leftNearBasePoint, nearBaseLineDir)[0];

			if (chipPos != undefined && touchLineIntersection != undefined) {
				if (robotPos.distanceTo(touchLineIntersection) < robotPos.distanceTo(chipPos)) {
					chipPos = touchLineIntersection;
				}
			} else if (touchLineIntersection != undefined) { // no nearBaseline
				chipPos = touchLineIntersection;
			} else {// probably because ball is out of field
				chipPos = World.Geometry.OpponentGoal;
			}
			let chipDist = World.Ball.pos.distanceTo(chipPos) - CHIP_IMPACT_DIST_FROM_BORDER;
			if (chipPos !== touchLineIntersection) { // try to avoid icing if chipping towards the opponent goal line
				chipDist = chipDist * CHIP_DIST_FACTOR;
			}

			vis.addCircle("t/a/chipToBorder", ballPos + robotDir.copy().setLength(chipDist), 0.1, vis.colors.blue, true);
			if (!Robot.hadBall(this._robot, 0)) {
				this._forceShoot._forceShootTimer = undefined;
			}
			this._forceShoot._doForceShoot();
			this._robot.chip(chipDist);
		}
	}
}
