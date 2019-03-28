import * as Constants from "base/constants";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { Position, RelativePosition, Vector } from "base/vector";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";
import * as RobotList from "glados/util/robotlist";

const POSITION_PADDING = 0.2; // safety distance

// normalize angle created by direction to be always relative to segment ball to field border
function getNormalizedAngle(direction: RelativePosition): number {
	let angle = direction.angle();
	if (World.Ball.pos.x > 0) {
		angle = geom.normalizeAnglePositive(angle);
	}
	return angle;
}

export class StopAttack extends Task {
	private _focusPoint: Position;
	private _side: "left" | "right";
	private _defenseHysteresis: boolean;
	private _minDistToBall: number;

	constructor(agent: Agent, minDistToBall: number = Constants.stopBallDistance) {
		super(agent);
		this._focusPoint = new Vector(0, -World.Geometry.FieldHeightHalf + 4 * this._robot.radius);
		this._side = World.Ball.pos.x < 0 ? "left" : "right";
		this._defenseHysteresis = false;
		this._minDistToBall = minDistToBall;
	}

	run() {
		let stopRadius = this._minDistToBall + this._robot.radius + POSITION_PADDING;
		let pos: Position | undefined = World.Ball.pos + (this._focusPoint - World.Ball.pos).setLength(stopRadius);
		let driveAngle = (World.Ball.pos - pos).angle();

		let [opponentShooter, dist] = UtilDefense.getClosestRobot(World.OpponentRobots, World.Ball.pos);

		// hysteresis on distance between opponent shooter and ball
		if (this._defenseHysteresis) {
			dist = dist - 0.5;
		}

		// try to always be where the opponent shooter will try to shoot
		let isOpponentFreekickState = World.RefereeState === "IndirectDefensive" || World.RefereeState === "DirectDefensive";
		let defendOpponentPasses = (World.Ball.pos.y > 0 || World.RefereeState === "IndirectDefensive") && isOpponentFreekickState;

		let passReceivers = RobotList.excludeRobots(World.OpponentRobots, [opponentShooter!, World.OpponentKeeper!]);
		if (dist < 0.2 + this._robot.radius && defendOpponentPasses && passReceivers.length > 0) {
			let minAngle = Infinity;
			let maxAngle = -Infinity;
			for (let robot of passReceivers) {
				let angle = getNormalizedAngle(Field.limitToAllowedField(Physics.robotBrakePos(robot), robot.radius) - World.Ball.pos);
				if (World.Ball.pos.x > 0) {
					angle = geom.normalizeAnglePositive(angle);
				}
				if (angle < minAngle) {
					minAngle = angle;
				}
				if (angle > maxAngle) {
					maxAngle = angle;
				}
			}
			let relativeAngle = getNormalizedAngle(World.Ball.pos - opponentShooter!.pos);
			let boundedAngle = MathUtil.bound(minAngle, relativeAngle, maxAngle);
			let opponentDirection = getNormalizedAngle(Vector.fromAngle(opponentShooter!.dir));
			let boundedOppDirection = MathUtil.bound(minAngle, opponentDirection, maxAngle);
			let middleAngle = (boundedAngle + boundedOppDirection) / 2;

			pos = World.Ball.pos + Vector.fromAngle(middleAngle).setLength(stopRadius);
			// try to hit the side of the opponent robot to reflect the ball out of the field
			driveAngle = (opponentShooter!.pos - pos).angle() + 0.02;

			this._defenseHysteresis = true;
			this._robot.setDribblerSpeed(0.8); // might be quite loud
		} else {
			// position between ball and goal
			this._defenseHysteresis = false;
			if (Field.isInFriendlyDefenseArea(pos, 4 * this._robot.radius + 0.05)) {
				let intersections = Field.intersectCircleDefenseArea(World.Ball.pos,
						stopRadius, 4 * this._robot.radius + 0.05, true);
				if (intersections.length > 0) {
					pos = undefined;
					let distanceToSqMin = Infinity;
					for (let p of intersections) {
						let distanceToSqCur = p.distanceToSq(World.Geometry.FriendlyGoal);
						if (distanceToSqCur < distanceToSqMin) {
							pos = p;
							distanceToSqMin = distanceToSqCur;
						}

	// 					TODO: Think!
	// 					if not pos or (this._side == "left" and p.x < pos.x) or
	// 							(this._side == "right" and p.x > pos.x) then
	// 						pos = p
	// 					end
					}
				}
			}
			if (this._side === "left" && World.Ball.pos.x < -0.3) {
				this._side = "right";
			} else if (this._side === "right" && World.Ball.pos.x > 0.3) {
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
