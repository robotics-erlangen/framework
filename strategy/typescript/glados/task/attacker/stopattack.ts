/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import * as Constants from "base/constants";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import { Robot } from "base/robot";
import { Position, RelativePosition, Vector } from "base/vector";
// import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import * as Physics from "glados/observer/physics";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";
import * as RobotList from "glados/util/robotlist";
import * as Volley from "glados/util/volley";

const POSITION_PADDING = 0.2; // safety distance
const DEFEND_GOAL_HYSTERESIS = 0.1;

// normalize angle created by direction to be always relative to segment ball to field border
function getNormalizedAngle(direction: RelativePosition): number {
	let angle = direction.angle();
	angle = geom.normalizeAnglePositive(angle);
	return angle;
}

/** Determine the angle range the ball may be passed in by the opponent and
 * bound it.
 *
 * We want to steal opponent passes, however the most important point to cover
 * is the goal center so we bound the angle range to not stray too far from it.
 */
function determineMaxCoveredPassAngles(passReceivers: readonly Robot[], ballPos: Vector): [number, number] {
	// Collect angles of opponent passes
	const opponentPassAngles = passReceivers.map((receiver) => {
		const receivingPos = Field.limitToAllowedField(
			Physics.robotBrakePos(receiver),
			-receiver.radius
		);

		// Should be within [-Pi; Pi]
		return (receivingPos - ballPos).angle();
	});

	// This is the direction we want to cover the most
	const shootPointToGoalAngle = (World.Geometry.FriendlyGoal - ballPos).angle();

	// Determine the angle range in which the ball can be passed to the
	// opponents - this is the cake slice we want to cover
	//
	// This area is possibly quite large so it will need to be bounded
	//
	// Since the output is counter-clockwise, the first diff is always <= 0 and
	// the last diff is always >= 0
	const [, , firstPassDiff, lastPassDiff] = geom.enclosingAngles(
		shootPointToGoalAngle,
		opponentPassAngles
	);

	// Some arbitrary value to bound the angle diff - may well be improved upon
	//
	// For example:
	// - Consider the distance the robot can drive while the opponent shoots
	//   across the stop distance
	// - Cover a different angle range depending on the distance to the goal or
	//   ballPos.x
	const MAX_DIFF_TO_GOAL = geom.degreeToRadian(50);

	const firstPassDiffBounded = Math.max(firstPassDiff, -MAX_DIFF_TO_GOAL);
	const lastPassDiffBounded = Math.min(lastPassDiff, MAX_DIFF_TO_GOAL);

	return [
		shootPointToGoalAngle + firstPassDiffBounded,
		shootPointToGoalAngle + lastPassDiffBounded,
	];
}

export class StopAttack extends Task {
	private _focusPoint: Position;
	private _side: "left" | "right";
	private _defenseHysteresis: boolean;
	private _defendGoalHysteresis: boolean;
	private _minDistToBall: number;

	public constructor(behavior: Behavior, minDistToBall = Constants.stopBallDistance) {
		super(behavior);
		this._focusPoint = new Vector(0, -World.Geometry.FieldHeightHalf + 4 * this._robot.radius);
		this._side = World.Ball.pos.x < 0 ? "left" : "right";
		this._defenseHysteresis = false;
		this._defendGoalHysteresis = false;
		this._minDistToBall = minDistToBall;

	}

	public run() {

		let ballPos = World.Ball.pos;
		// already go to the freekick position during ballplacement
		if (World.RefereeState === "BallPlacementDefensive" && World.BallPlacementPos) {
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
		const defendGoalDistance = 4 + (this._defendGoalHysteresis ? DEFEND_GOAL_HYSTERESIS : -DEFEND_GOAL_HYSTERESIS);

		const defendOpponentPasses = Referee.isOpponentFreeKickState()
			&& ballPos.distanceTo(World.Geometry.FriendlyGoal) > defendGoalDistance;

		this._defendGoalHysteresis = !defendOpponentPasses;

		let passReceivers = RobotList.excludeRobots(World.OpponentRobots, [opponentShooter!, World.OpponentKeeper!]);
		if (dist < 0.2 + this._robot.radius && defendOpponentPasses && passReceivers.length > 0) {
			let [firstPassAngle, lastPassAngle] = determineMaxCoveredPassAngles(passReceivers, ballPos);

			// The code below expects the angle to be in the range [0; 2*Pi]
			firstPassAngle = geom.normalizeAnglePositive(firstPassAngle);
			lastPassAngle = geom.normalizeAnglePositive(lastPassAngle);

			const minAngle = Math.min(firstPassAngle, lastPassAngle);
			const maxAngle = Math.max(firstPassAngle, lastPassAngle);

			// vis.addPath("stopattack: MaxAngleBounded", [ballPos, ballPos + Vector.fromAngle(maxAngle)], vis.colors.black);
			// vis.addPath("stopattack: MinAngleBounded", [ballPos, ballPos + Vector.fromAngle(minAngle)], vis.colors.blackHalf);

			let relativeAngle = getNormalizedAngle(ballPos - opponentShooter!.pos);
			let boundedAngle = geom.angleBound(minAngle, relativeAngle, maxAngle);
			let opponentDirection = getNormalizedAngle(Vector.fromAngle(opponentShooter!.dir));
			let boundedOppDirection = geom.angleBound(minAngle, opponentDirection, maxAngle);
			let middleAngle = (boundedAngle + boundedOppDirection) / 2;
			pos = ballPos + Vector.fromPolar(middleAngle, stopRadius);
			// try to reflect the ball to the opponents goal
			let hypotheticalBall = { pos: ballPos, speed: (pos - ballPos).withLength(Constants.maxBallSpeed), maxSpeed: Constants.maxBallSpeed, posZ: 0, initSpeedZ: 0, speedZ: 0 };
			let time = Physics.ballTravelTime(hypotheticalBall, (ballPos - pos).length());
			let futureBall = Physics.ballAtTime(hypotheticalBall, time);
			driveAngle = Volley.calcPhi(this._robot, futureBall.speed, pos, World.Geometry.OpponentGoal, Infinity)[0];
			// vis.addPath("t/a/stopattack: reflectionNormal", [ballPos, pos, pos + Vector.fromAngle(driveAngle), pos, pos + ((World.Geometry.OpponentGoal - pos).normalized())]);

			// Go back a little so the ball will hit the front side of the robot
			pos = pos - Vector.fromPolar(driveAngle, this._robot.shootRadius);
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
			task: this,
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		this._robot.trajectory.update(ToTarget, pos, driveAngle);
	}
}
