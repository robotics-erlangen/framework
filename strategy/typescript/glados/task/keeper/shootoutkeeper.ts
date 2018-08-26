import * as Field from "base/field";
import * as geom from "base/geom";
import * as vis from "base/vis";
import {Vector} from "base/vector";
import * as World from "base/world";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as PathHelper from "glados/trajectory/pathhelper";
import {ToTarget} from "glados/trajectory/totarget";
import {Task, Agent} from "glados/task/base";
import {ForceShoot} from "glados/task/ability/forceshoot";
import * as Goal from "glados/observer/goal";

const G = World.Geometry;

const POSITION_PADDING = 0.02; // safety distance

const CHIP_IMPACT_DIST_FROM_BORDER = 0.5;
const CHIP_DIST_FACTOR = 0.25;
const CHIP_GOAL_LINE_DIST = 1;

const SAFE_GOAL_MID = G.FriendlyGoal - new Vector(0, 0.05);

const OBSTACLE_TABLE: PathHelper.PathHelperParameters = {
	ignorePass: true
};

const leftFriendlyCorner = new Vector(-G.FieldWidthHalf, -G.FieldHeightHalf);
const rightFriendlyCorner = new Vector(G.FieldWidthHalf, -G.FieldHeightHalf);

// assume chips crossing this line might cross the goal line
const leftNearBasePoint = new Vector(-G.FieldWidthHalf, G.FieldHeightHalf-CHIP_GOAL_LINE_DIST);
const rightNearBasePoint = new Vector(G.FieldWidthHalf, G.FieldHeightHalf-CHIP_GOAL_LINE_DIST);
const nearBaseLineDir = rightNearBasePoint-leftNearBasePoint;

export class ShootoutKeeper extends Task {
	private _forceShoot: ForceShoot;

	constructor(agent: Agent) {
		super(agent);
		this._forceShoot = new ForceShoot(this._robot);
	}

	public run () {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, OBSTACLE_TABLE);

		let moveDest
		let endspeed = new Vector(0,0);
		let ballSpeed = World.Ball.speed;
		let viewDir = World.Ball.pos - SAFE_GOAL_MID;

		let ballTime = Math.min(Robot.minTimeToBall(this._robot), 1);

		let ballCloserToGoal = World.Ball.pos.y < this._robot.pos.y + POSITION_PADDING;
		PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignoreBall, !ballCloserToGoal);
		if (ballCloserToGoal) {
			// get between ball and goal
			let ballDist = this._robot.radius + World.Ball.radius;
			moveDest = World.Ball.pos + (SAFE_GOAL_MID - World.Ball.pos).setLength(ballDist) + new Vector(0, -POSITION_PADDING);
		} else {
			moveDest = Physics.ballAtTime(World.Ball, ballTime).pos;
			moveDest = moveDest + (this._robot.pos - moveDest).setLength(World.Ball.radius + this._robot.radius);
		}

		if (ballSpeed.y < 0) {
			let [pos, dir] = Goal.predictShot();

			// The x coordinate where the predicted ball will cross the goal line
			let predictedGoallinePoint = geom.intersectLineLine(G.FriendlyGoal, new Vector(1, 0), pos, dir)[0].x;
			// The distance of the predicted point as a percentage of the half goal width, is 1 if the point is inside the goal
			let centerDistancePerc = Math.max(2 * Math.abs(predictedGoallinePoint) / G.GoalWidth, 1);

			// Used to determine a spot between predicted shot position and the catch position near the ball
			let alpha = ( 1 - Math.exp(-ballSpeed.length() / 2) ) / ( 1 + this._robot.pos.distanceTo(pos) / 2 );
			// It is unlikely that the opponent doesn't want to shoot the ball at our goal
			alpha = alpha / centerDistancePerc;

			let interceptPos = this._robot.pos.orthogonalProjection(pos, pos+dir)[0];

			vis.addCircle("t/k/shootoutkeeper: intercept", interceptPos, World.Ball.radius, vis.colors.gold, true);
			vis.addCircle("t/k/shootoutkeeper: intercept", moveDest, World.Ball.radius, vis.colors.gold, true);

			// If the ball was shot and we probably wont reach it in time, we go rambo
			if (ballSpeed.y < -2 && ballTime == 1) {
				endspeed = (interceptPos - this._robot.pos).setLength(2) + this._robot.speed;
				moveDest = this._robot.pos + (this._robot.speed + endspeed) * ballTime / 2;
			} else {
				moveDest = moveDest * (1 - alpha) + interceptPos * alpha;
			}
		} else {
			endspeed = viewDir * 0.5;
		}

		this._chipToBorderIfSafe();

		this._robot.trajectory.update(ToTarget, moveDest, viewDir.angle(), undefined, endspeed);
	}

	_chipToBorderIfSafe () {
		let robotPos = this._robot.pos;
		let ballPos = World.Ball.pos;
		let robotDir = ballPos - robotPos;
		let viewAngle = robotDir.angle();
		let rigthCornerAngle = (rightFriendlyCorner - robotPos).angle();
		let leftCornerAngle = (leftFriendlyCorner - robotPos).angle();
		if (viewAngle > rigthCornerAngle || viewAngle < leftCornerAngle) { // not towards own goal line
			let touchLineIntersection = Field.nextLineCut(robotPos, robotDir);
			let chipPos = geom.intersectLineLine(robotPos, robotDir, leftNearBasePoint, nearBaseLineDir)[0];

			if (chipPos && touchLineIntersection) {
				if (robotPos.distanceTo(touchLineIntersection) < robotPos.distanceTo(chipPos)) {
					chipPos = touchLineIntersection;
				}
			} else if (touchLineIntersection) { // no nearBaseline
				chipPos = touchLineIntersection;
			} else {// probably because ball is out of field
				chipPos = G.OpponentGoal;
			}
			let chipDist = World.Ball.pos.distanceTo(chipPos) - CHIP_IMPACT_DIST_FROM_BORDER;
			if (chipPos != touchLineIntersection) { // try to avoid icing if chipping towards the opponent goal line
				chipDist = chipDist*CHIP_DIST_FACTOR;
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