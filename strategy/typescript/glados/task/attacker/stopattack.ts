import * as Constants from "base/constants";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { RefereeState } from "base/referee";
import { Position, RelativePosition, Vector } from "base/vector";
// import * as vis from "base/vis";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";
import { Volley } from "glados/task/ability/volley";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";
import * as RobotList from "glados/util/robotlist";

const POSITION_PADDING = 0.2; // safety distance
const DEFEND_GOAL_HYSTERESIS = 0.1;

// normalize angle created by direction to be always relative to segment ball to field border
function getNormalizedAngle(direction: RelativePosition): number {
	let angle = direction.angle();
	angle = geom.normalizeAnglePositive(angle);
	return angle;
}

export class StopAttack extends Task {
	private _focusPoint: Position;
	private _side: "left" | "right";
	private _defenseHysteresis: boolean;
	private _defendGoalHysteresis: boolean;
	private _minDistToBall: number;

	constructor(agent: Agent, minDistToBall: number = Constants.stopBallDistance) {
		super(agent);
		this._focusPoint = new Vector(0, -World.Geometry.FieldHeightHalf + 4 * this._robot.radius);
		this._side = World.Ball.pos.x < 0 ? "left" : "right";
		this._defenseHysteresis = false;
		this._defendGoalHysteresis = false;
		this._minDistToBall = minDistToBall;

	}

	run() {

		let ballPos = World.Ball.pos;
		// already go to the freekick position during ballplacement
		if (World.RefereeState === RefereeState.BallPlacementDefensive && World.BallPlacementPos) {
			ballPos = World.BallPlacementPos;
		}

		let stopRadius = this._minDistToBall + this._robot.radius + POSITION_PADDING;
		let pos: Position = ballPos + (this._focusPoint - ballPos).withLength(stopRadius);
		let driveAngle = (ballPos - pos).angle();

		let [opponentShooter, dist] = UtilDefense.getClosestRobot(World.OpponentRobots, ballPos);

		// hysteresis on distance between opponent shooter and ball
		if (this._defenseHysteresis) {
			dist = dist - 0.5;
		}

		// try to always be where the opponent shooter will try to shoot
		let isOpponentFreekickState = World.RefereeState === "DirectDefensive";
		let defendGoalDistance = 4;
		defendGoalDistance = this._defendGoalHysteresis ? defendGoalDistance + DEFEND_GOAL_HYSTERESIS : defendGoalDistance - DEFEND_GOAL_HYSTERESIS;
		let defendOpponentPasses = ((ballPos - World.Geometry.FriendlyGoal).length() > defendGoalDistance) && isOpponentFreekickState;
		this._defendGoalHysteresis = !defendOpponentPasses;

		let passReceivers = RobotList.excludeRobots(World.OpponentRobots, [opponentShooter!, World.OpponentKeeper!]);
		if (dist < 0.2 + this._robot.radius && defendOpponentPasses && passReceivers.length > 0) {
			let minAngle = Infinity;
			let maxAngle = -Infinity;
			for (let robot of passReceivers) {
				let angle = getNormalizedAngle(Field.limitToAllowedField(Physics.robotBrakePos(robot), robot.radius) - ballPos);
				angle = geom.normalizeAnglePositive(angle);
				if (angle < minAngle && angle >= Math.PI) {
					minAngle = angle;
				}
				if (angle > maxAngle && angle >= Math.PI) {
					maxAngle = angle;
				}

			}
			if (minAngle === Infinity) {
				minAngle = Math.PI;
			}
			if (maxAngle === -Infinity) {
				maxAngle = 2 * Math.PI;
			}
			// used coordinate system from the attacker's point of view
			// in this calculation 12 corresponds to 1.5 Pi (angle to opp Goal)
			// 10 corresponds to 1.5 Pi - Pi/4 = 5/4 Pi
			// 14 corresponds to 1.5 Pi + PI/4 = 7/4 Pi
			let maxAllowedAngle = 14;
			let minAllowedAngle = 10;
			const middleShift = 0;
			const quarterShift = 1;
			const borderShift = 2;
			const quarterBegin = 0.7;
			const borderBegin = 1.7;
			// vis.addPath("stopattack: MaxAngle", [ballPos, ballPos + Vector.fromAngle(maxAngle).normalized()], vis.colors.red);
			// vis.addPath("stopattack: MinAngle", [ballPos, ballPos + Vector.fromAngle(minAngle).normalized()], vis.colors.redHalf);
			if (ballPos.x > (quarterBegin * World.Geometry.FieldWidthQuarter) && ballPos.x < (borderBegin * World.Geometry.FieldWidthQuarter)) {
				maxAllowedAngle -= quarterShift;
				minAllowedAngle -= quarterShift;
			} else if (ballPos.x < (-quarterBegin * World.Geometry.FieldWidthQuarter) && ballPos.x > (-borderBegin * World.Geometry.FieldWidthQuarter)) {
				maxAllowedAngle += quarterShift;
				minAllowedAngle += quarterShift;
			} else if (ballPos.x >= (borderBegin * World.Geometry.FieldWidthQuarter)) {
				maxAllowedAngle -= borderShift;
				minAllowedAngle -= borderShift;
			} else if (ballPos.x <= (-borderBegin * World.Geometry.FieldWidthQuarter)) {
				maxAllowedAngle += borderShift;
				minAllowedAngle += borderShift;
			} else {
				maxAllowedAngle -= middleShift;
				minAllowedAngle += middleShift;
			}
			if (ballPos.y < -World.Geometry.FieldHeightQuarter) {
				if (ballPos.x > quarterBegin) {
					maxAllowedAngle = ((World.Geometry.FriendlyGoalRight - ballPos).angle());
					minAllowedAngle = (maxAllowedAngle - Math.PI / 4);
					minAllowedAngle = minAllowedAngle / Math.PI * 8;
					maxAllowedAngle = maxAllowedAngle / Math.PI * 8;
				} else if (ballPos.x < -quarterBegin) {
					minAllowedAngle = ((World.Geometry.FriendlyGoalLeft - ballPos).angle());
					maxAllowedAngle = (minAllowedAngle + Math.PI / 4);
					minAllowedAngle = minAllowedAngle / Math.PI * 8;
					maxAllowedAngle = maxAllowedAngle / Math.PI * 8;
				}
			}
			maxAllowedAngle = maxAllowedAngle * Math.PI / 8;
			minAllowedAngle = minAllowedAngle * Math.PI / 8;
			// vis.addPath("stopattack: MaxAllowedAngle", [ballPos, ballPos + Vector.fromAngle(maxAllowedAngle).normalized()], vis.colors.green);
			// vis.addPath("stopattack: MinAllowedAngle", [ballPos, ballPos + Vector.fromAngle(minAllowedAngle).normalized()], vis.colors.greenHalf);

			maxAngle = MathUtil.bound(minAllowedAngle, maxAngle, maxAllowedAngle);
			minAngle = MathUtil.bound(minAllowedAngle, minAngle, maxAllowedAngle);
			// vis.addPath("stopattack: MaxAngleBounded", [ballPos, ballPos + Vector.fromAngle(maxAngle).normalized()], vis.colors.black);
			// vis.addPath("stopattack: MinAngleBounded", [ballPos, ballPos + Vector.fromAngle(minAngle).normalized()], vis.colors.blackHalf);

			let relativeAngle = getNormalizedAngle(ballPos - opponentShooter!.pos);
			let boundedAngle = MathUtil.bound(minAngle, relativeAngle, maxAngle);
			let opponentDirection = getNormalizedAngle(Vector.fromAngle(opponentShooter!.dir));
			let boundedOppDirection = MathUtil.bound(minAngle, opponentDirection, maxAngle);
			let middleAngle = (boundedAngle + boundedOppDirection) / 2;
			pos = ballPos + Vector.fromAngle(middleAngle).withLength(stopRadius);
			// try to reflect the ball to the opponents goal
			let hypotheticalBall = {pos: ballPos, speed: (pos - ballPos).withLength(Constants.maxBallSpeed), maxSpeed: Constants.maxBallSpeed, posZ: 0, initSpeedZ: 0, speedZ: 0};
			let time = Physics.ballTravelTime(hypotheticalBall, (ballPos - pos).length());
			let futureBall = Physics.ballAtTime(hypotheticalBall, time);
			driveAngle = Volley.calcPhi(this._robot, futureBall.speed, pos, World.Geometry.OpponentGoal, Infinity)[0];
			// vis.addPath("t/a/stopattack: reflectionNormal", [ballPos, pos, pos + Vector.fromAngle(driveAngle), pos, pos + ((World.Geometry.OpponentGoal - pos).normalized())]);

			// Go back a little so the ball will hit the front side of the robot
			pos = pos - Vector.fromAngle(driveAngle).withLength(this._robot.shootRadius);
			this._defenseHysteresis = true;
			this._robot.setDribblerSpeed(0.8); // might be quite loud
		} else {
			// position between ball and goal
			this._defenseHysteresis = false;
			if (Field.isInFriendlyDefenseArea(pos, 4 * this._robot.radius + 0.05)) {
				let intersections = Field.intersectCircleDefenseArea(ballPos, stopRadius, 4 * this._robot.radius + 0.05, true);
				if (intersections.length > 0) {
					// pos = undefined;
					let distanceToSqMin = Infinity;
					for (let p of intersections) {
						let distanceToSqCur = p.distanceToSq(World.Geometry.FriendlyGoal);
						if (distanceToSqCur < distanceToSqMin) {
							pos = p;
							distanceToSqMin = distanceToSqCur;
						}

						// TODO: Think!
						// if not pos or (this._side == "left" and p.x < pos.x) or
						// 	(this._side == "right" and p.x > pos.x) then
						// 		pos = p
						// end
					}
				}
			}
			if (this._side === "left" && ballPos.x < -0.3) {
				this._side = "right";
			} else if (this._side === "right" && ballPos.x > 0.3) {
				this._side = "left";
			}

			if (World.RefereeState === "DirectDefensive" || World.RefereeState === "IndirectDefensive") {
				this._robot.setDribblerSpeed(0.6);
			}
		}

		let obstacleTable = {
			ignorePass: false,
			messaging: this._messaging
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		this._robot.trajectory.update(ToTarget, pos, driveAngle);
	}
}
