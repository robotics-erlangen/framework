import * as Constants from "base/constants";
import { allowedMaxBallSpeed } from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import { ForceShoot } from "glados/task/ability/forceshoot";
import { Task } from "glados/task/base";
import { CurvedMaxAccel as ToTarget } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";


const G = World.Geometry;
const GOAL_NORMAL = new Vector(0, 1);
const GOAL_BUFFER = 0.3;

export class Keeper extends Task {
	private _defendCorner: boolean = false;
	private _forceShoot: ForceShoot;
	private _lastBallBehindKeeper: boolean = false;

	public constructor(behavior: Behavior) {
		super(behavior);
		this._forceShoot = new ForceShoot(this);
	}

	// moves keeper do defending possition
	public run() {
		let keeperGoalDistance = 0.06;
		if (Referee.isOpponentPenaltyState()) {
			// during penalty prepare, the keeper has to touch the goal line
			// after normal start, just keep this distance
			keeperGoalDistance = -0.02;
		}

		let [atkPos, atkDir, isShot] = Goal.predictShot();
		atkDir = atkDir.withLength(30);
		let side = MathUtil.sign(atkPos.x);

		// check if opponent would shoot at the goal from somewhere near the field corners
		// how far the ball is off to the sides
		// use hysteresis to prevent flickering between positions
		let sideAngle = GOAL_NORMAL.absoluteAngleDiff(atkPos - G.FriendlyGoal);
		if (sideAngle > geom.degreeToRadian(45)) {
			this._defendCorner = true;
		} else if (sideAngle < geom.degreeToRadian(30)) {
			this._defendCorner = false;
		}

		// keep the goalie inside the goal to exploit its full diameter for blocking incoming balls
		let goalWidthHalf = G.GoalWidth / 2 - 0.015;

		// line to move along for defending
		let defenseLineStart, defenseLineEnd, fallbackPos;
		// corners should be defended and atkPos is outside the goal
		if (this._defendCorner && (Math.abs(atkPos.x) > goalWidthHalf
				|| atkPos.y < G.FriendlyGoal.y - G.GoalDepth)) {
			debug.set("mode", "defend corner");
			// defend short corner
			// line starts a goal post, stay as near to the goal as possible
			defenseLineStart = new Vector(side * goalWidthHalf, G.FriendlyGoal.y);
			let lineDir = ((new Vector(0, defenseLineStart.y) - atkPos).perpendicular() * side).normalized();
			if (side * lineDir.x > 0) {
				lineDir = new Vector(0, 1);
			}
			// move startpoint out of the goal along the direction
			defenseLineStart = defenseLineStart + lineDir * (this._robot.radius + 0.005);

			// opposite corner
			let otherGoalPost = new Vector(-side * goalWidthHalf, G.FriendlyGoal.y);
			// position where the robot would block the otherGoalPost
			// lambdaLine is distance from defenseLineStart in direction of lineDir
			let lambdaLine = geom.intersectLineLine(defenseLineStart, lineDir,
					otherGoalPost, atkPos - otherGoalPost)[1] || 0;

			// allow moving behind ball when it's shot
			if (!isShot) {
				lambdaLine -= this._robot.radius;
			}
			defenseLineEnd = defenseLineStart + lineDir * Math.max(0, lambdaLine);

			// stick to goal post as fallback
			fallbackPos = defenseLineStart;
		} else {
			debug.set("mode", "defend line");
			// defend along the goal line and occupy as much space in the goal as possible
			// idea: cut defense line with line from goal posts to ball (attack pos)
			// account for robot radius
			let goalCornerLeft = new Vector(-goalWidthHalf, G.FriendlyGoal.y);
			let goalCornerRight = new Vector(goalWidthHalf, G.FriendlyGoal.y);
			let goalLineY = G.FriendlyGoal.y + keeperGoalDistance + this._robot.radius;
			let lineDist = Math.abs(goalLineY - goalCornerLeft.y);

			let leftBound = -goalWidthHalf;
			let angleLeft = GOAL_NORMAL.angleDiff(atkPos - goalCornerLeft);
			if (Math.abs(angleLeft) < Math.PI / 2) {
				// distance cutoff by angle to atkPos + distance blocked by robot radius
				// ignore robot radius when isShot is set, in order to allow the robot to get behind the ball
				let leftDist = -Math.tan(angleLeft) * lineDist + (isShot ? 0 : this._robot.radius / Math.cos(angleLeft));
				leftBound = leftBound + Math.max(0, leftDist);
			}

			let rightBound = goalWidthHalf;
			let angleRight = GOAL_NORMAL.angleDiff(atkPos - goalCornerRight);
			if (Math.abs(angleRight) < Math.PI / 2) {
				let rightDist = -Math.tan(angleRight) * lineDist - (isShot ? 0 : this._robot.radius / Math.cos(angleRight));
				rightBound = rightBound + Math.min(0, rightDist);
			}

			defenseLineStart = new Vector(leftBound, goalLineY);
			defenseLineEnd = new Vector(rightBound, goalLineY);
			// center
			fallbackPos = (defenseLineEnd + defenseLineStart) * 0.5;
		}

		// intersect defense line with ball trajectory
		let defenseDir = defenseLineEnd - defenseLineStart;
		let lambdaDef = geom.intersectLineLine(defenseLineStart, defenseDir,
				atkPos, atkDir)[1];
		let intersectPos;
		let successfulIntersection; // is original intersection point on the defense line
		if (lambdaDef != undefined) {
			debug.set("lambdaDef", lambdaDef);
			let lambdaBounded = MathUtil.bound(0, lambdaDef, 1);
			successfulIntersection = (lambdaDef === lambdaBounded);
			if (lambdaDef === lambdaBounded
					// add some safety cm to detect shots towards the goal posts even without precise ball direction
					|| defenseDir.length() >= 0.01 && Math.abs(lambdaDef - lambdaBounded) < 0.05 / defenseDir.length()) {
				successfulIntersection = true;
			}
			// limit to positions on the line segment!
			intersectPos = defenseLineStart + defenseDir * lambdaBounded;
		} else {
			successfulIntersection = false;
			// ensure there's an intersect pos
			intersectPos = fallbackPos;
		}

		vis.addPath("t/keeper: KeeperShotPrediction", [atkPos, atkPos + atkDir], vis.colors.green);
		vis.addCircle("t/keeper: KeeperDefenseLineIntersect", intersectPos, 0.03, vis.colors.green);
		vis.addPath("t/keeper: KeeperDefenseLine", [defenseLineStart, defenseLineEnd], vis.colors.green);

		let moveTo;
		let endSpeed;
		let ignoreBall = true;
		// ball is shot at the goal: take the shortest way to stop the ball
		if (isShot && atkDir.y < 0 && successfulIntersection &&
				Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius)) {
			let ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0);
			let robotDist = Field.distanceToFriendlyGoalLine(this._robot.pos, 0);
			let hysteresisDist = this._lastBallBehindKeeper ? 0.15 : 0;
			let ballBehindKeeper = ballDist - hysteresisDist < robotDist;
			this._lastBallBehindKeeper = ballBehindKeeper;
			if (ballBehindKeeper) {
				ignoreBall = false;
				moveTo = intersectPos;
			} else {
				// nearest pos on the ball trajectory
				ignoreBall = true;
				moveTo = this._robot.pos.nearestPosOnLine(atkPos, atkPos + atkDir);

				// Move back while blocking the shot
				if (this._robot.pos.distanceTo(moveTo) < 0.5 * this._robot.radius &&
					(this._robot.speed.orthogonalComponent(atkDir)).lengthSq() < 0.01) {
					moveTo = intersectPos;
				}
			}
			if (Referee.isOpponentPenaltyState() // during penalty the keeper has to touch the goalline
					|| moveTo.y < defenseLineStart.y) { // prevent moving into the goal
				moveTo = intersectPos;
			}

			// get to position as fast as possible
			let ballRollDistance = Math.max(0, moveTo.distanceTo(World.Ball.pos) - World.Ball.radius - this._robot.shootRadius);
			let availableTime = Physics.ballRollTime(World.Ball, ballRollDistance);
			// use moveTo position to be there as fast as possible
			endSpeed = Physics.robotMinEndspeed(this._robot, moveTo, availableTime);

			if (this._robot.pos.distanceToSq(moveTo) < 2 * 2 * this._robot.radius * this._robot.radius &&
				World.Ball.pos.distanceToSq(moveTo) >= 1.5 * this._robot.pos.distanceToSq(moveTo)) {
				endSpeed = new Vector(0, 0);
			}

			debug.set("endSpeed", endSpeed);

		// block estimated shoot line
		} else if (atkDir.y < 0) {
			let k = MathUtil.bound(0, (atkPos.y + 2) / 2 * 0.6, 0.5);
			moveTo = intersectPos * (1 - k) + new Vector(0, -G.FieldHeightHalf + keeperGoalDistance + this._robot.radius) * k;
		} else { // don't know where to go, just center in the goal / corner
			moveTo = fallbackPos;
		}

		// bound the moveTo if the rotationConditionNumber is sufficiently large
		let rotCondNum = Goal.rotationConditionNumber();

		// Don't bound the keeper pos if predictShot just barely misses the goal for balls with spin
		let [_, extendedIntersectGoal, extendedIntersectShot] = geom.intersectLineLine(
			defenseLineStart - defenseDir.withLength(GOAL_BUFFER),
			(1 + GOAL_BUFFER) * defenseDir,
			atkPos,
			atkDir
		);

		if ((!isShot && (rotCondNum !== undefined && rotCondNum > 1e-2)) ||
			((rotCondNum === undefined || rotCondNum <= 1e-2) && ((extendedIntersectShot == undefined || extendedIntersectShot < 0) ||
			(extendedIntersectGoal == undefined || extendedIntersectGoal < 0 || extendedIntersectGoal > 1)))) {
			let shotBall = [
				{ speed: (defenseLineEnd - World.Ball.pos).withLength(allowedMaxBallSpeed), maxSpeed: allowedMaxBallSpeed },
				{ speed: (defenseLineStart - World.Ball.pos).withLength(allowedMaxBallSpeed), maxSpeed: allowedMaxBallSpeed }
			];

			let minBallTravelTime = [
				Physics.ballRollTime(shotBall[0], (defenseLineEnd - World.Ball.pos).length()),
				Physics.ballRollTime(shotBall[1], (defenseLineStart - World.Ball.pos).length())
			];

			let maxDistToCorner = [
				MathUtil.bound(0, Physics.robot1DMaxRangeInTime(this._robot, defenseDir, minBallTravelTime[0]),
				Math.min((this._robot.pos - defenseLineEnd).dot(-defenseDir.normalized()), 1 / 2 * defenseDir.length())),
				MathUtil.bound(0, Physics.robot1DMaxRangeInTime(this._robot, -defenseDir, minBallTravelTime[1]),
				Math.min((this._robot.pos - defenseLineStart).dot(defenseDir.normalized()), 1 / 2 * defenseDir.length()))
			];

			debug.set("maxDistToCorner", maxDistToCorner);

			let bounds = [
				defenseLineEnd - defenseDir.withLength(maxDistToCorner[0]),
				defenseLineStart + defenseDir.withLength(maxDistToCorner[1])
			];

			vis.addCircle("keeper/bounds", bounds[0], 0.1, vis.colors.darkPurple, false);
			vis.addCircle("keeper/bounds", bounds[1], 0.1, vis.colors.darkPurple, false);

			moveTo = defenseDir.withLength(
				MathUtil.bound(0, (moveTo - bounds[1]).dot(defenseDir.normalized()), (bounds[0] - bounds[1]).length())
			) + bounds[1];
		}

		// use the large stop ball obstacle if we are not in our defense area yet
		let stopBallRadius = Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius)
			? 0.05 : Constants.stopBallDistance;

		// ignore goal walls if ball is shot
		let obstacleTable: PathHelper.PathHelperParameters = {
			ignoreBall: ignoreBall,
			ignoreGoals: isShot,
			ignoreDefenseArea: true,
			stopBallDistance: stopBallRadius,
			ignorePass: true
		};
		// don't add obstacles if inside keeper area, when drivin to goal initially
		if (Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius)) {
			obstacleTable.ignoreFriendlyRobots = true;
			obstacleTable.ignoreOpponentRobots = true;
		}
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._robot.trajectory.update(ToTarget, moveTo, (atkPos - moveTo).angle(), undefined, endSpeed);

		if (!Robot.hadBall(this._robot, 0)) {
			this._forceShoot.forceShootTimer = undefined;
		}
		let chipActivationAngle = Math.PI / 6;
		let ballToRobot = this._robot.pos - World.Ball.pos;
		if ((World.RefereeState === "Game" || World.RefereeState === "GameForce")
				&& World.Ball.speed.absoluteAngleDiff(ballToRobot) < chipActivationAngle
				&& World.Ball.pos.distanceTo(this._robot.pos) < 1) {
			debug.set("chip", true);
			this._robot.chip(3);
			this._forceShoot.doForceShoot();
		}
	}
}
