import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { BaseTaskAssignment, Behavior, CONTINUE_TASK, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import { ShootGoal } from "glados/task/attacker/shootgoal";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as Attack from "glados/util/attack";

const BALL_APPROACH_BUFFER = 0.35;

export class FeintGoalShot extends Behavior {
	private lastKepperWasLeft: boolean = false;
	private redecideCounter: number = 0;

	constructor(agent: Agent) {
		super(agent);
	}

	check(): Behavior | undefined {
		if (this._messaging.receiveTrainer(MessageType.mainAttacker) !== this._robot) {
			this.redecideCounter = 0;
		}

		this._messaging.receiveTrainer(MessageType.mainAttacker);
		debug.push("FeintGoalShotCheck");

		if (this.redecideCounter > 5) {
			debug.set("return case", "active too long");
			debug.pop();
			amun.log("Hello World!");
			return undefined;
		}

		if (this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot
			&& Field.distanceToOpponentDefenseArea(this._robot.pos, this._robot.radius) < 1.5
			&& (Robot.hadBall(this._robot, 0.1) || Ball.lastBallOwner() === this._robot)
			&& Math.abs(this._robot.pos.x) < World.Geometry.DefenseWidthHalf) {

			if (World.OpponentKeeper == undefined) {
				debug.set("return case", "no Keeper");
				debug.pop();
				return undefined;
			}

			// let isPressed = Robot.isPressed(this._robot, World.Ball.pos);
			// if (isPressed) {
			// 	debug.set("return case", "pressed");
			// 	debug.pop();
			// 	return undefined;
			// }

			if (Field.distanceToOpponentDefenseArea(this._robot.pos, this._robot.radius) < 2 * this._robot.radius) {
				debug.set("return case", "close to defense");
				debug.pop();
				return this;
			}

			// Check how much the cone GoalLeft - Ball - GoalRight is occupied by CBs
			let angleBounds = [
				(World.Geometry.OpponentGoalLeft - World.Ball.pos).angle(),
				(World.Geometry.OpponentGoalRight - World.Ball.pos).angle()
			];
			debug.set("angleBounds", angleBounds);
			let interferingBots = World.OpponentRobots.filter((robot, index) => {
				if (robot.id === World.OpponentKeeper!.id) {
					return false;
				}
				let ballRobotDir = (robot.pos - World.Ball.pos).angle();
				if (ballRobotDir > angleBounds[1] && ballRobotDir < angleBounds[0]) {
					return true;
				}
				let [intersectLeft, _, _2] = geom.intersectLineCircle(World.Ball.pos, (World.Geometry.OpponentGoalLeft - World.Ball.pos), robot.pos, robot.radius);
				let [intersectRight, _3, _4] = geom.intersectLineCircle(World.Ball.pos, (World.Geometry.OpponentGoalRight - World.Ball.pos), robot.pos, robot.radius);
				if (intersectRight !== undefined || intersectLeft !== undefined) {
					return true;
				}
				return false;
			});

			for (let robot of [...interferingBots, World.OpponentKeeper]) {
				if (Attack.goalDefenseRatio(World.Ball.pos, robot) > 0.75) {
					debug.set("return case", "blocked");
					debug.pop();
					return undefined;
				}
			}

			let triangleHeight = Field.distanceToOpponentDefenseArea(World.Ball.pos, 0);
			let sideLengths = [
				triangleHeight * Math.tan((World.Geometry.OpponentGoalLeft - World.Ball.pos).absoluteAngleDiff(new Vector(0, 1))),
				triangleHeight * Math.tan((World.Geometry.OpponentGoalRight - World.Ball.pos).absoluteAngleDiff(new Vector(0, 1))),
			];
			let totalSideLength = sideLengths[0] + sideLengths[1];
			let cBDefenseRatio = 2 * interferingBots.length * this._robot.radius / totalSideLength;

			debug.set("interferingBots", interferingBots);
			debug.set("CBDefenseRatio", cBDefenseRatio);
			debug.set("toalSideLength", totalSideLength);

			if (cBDefenseRatio < 0.5) {
				debug.set("return case", "clear");
				debug.pop();
				return this;
			}
			debug.set("return case", "CB defense");
			debug.pop();
			return undefined;
		}
		debug.set("return case", "prerequisites");
		debug.pop();
		return undefined;
	}

	stop() {
		this.lastKepperWasLeft = false;
		this._task = undefined;
	}

	_updateTask(): BaseTaskAssignment | typeof CONTINUE_TASK {

		// Do not redecide at all
		if (this._task instanceof ShootGoal) {
			return [ShootGoal];
		}

		let keeper = World.OpponentKeeper!;

		// Determine if we should shoot our shot now
		let shotBall: Physics.BallLike & { radius: number } = {
			pos: World.Ball.pos,
			speed: (World.Ball.pos - this._robot.pos).withLength(this._robot.maxShotLinear),
			maxSpeed: this._robot.maxShotLinear,
			radius: World.Ball.radius,
			posZ: 0,
			speedZ: 0,
			initSpeedZ: 0
		};

		// Calculate time it takes for the ball to roll into the goal
		let [intersectPos, lambda1, lambda2] = geom.intersectLineLine(
			World.Ball.pos, (World.Ball.pos - this._robot.pos),
			World.Geometry.OpponentGoalLeft, World.Geometry.OpponentGoalRight - World.Geometry.OpponentGoalLeft
		);

		if (intersectPos && lambda2! > 0 && lambda2! < 1) {
			let ballTime = Physics.ballRollTime(
				shotBall,
				World.Ball.pos.distanceTo(intersectPos)
			);

			// Try to predict good positions for the keeper to intercept the pos
			// First possibility: shortest direct path (orthogonalProjection)
			let keeperTargetPos = keeper.pos.orthogonalProjection(World.Ball.pos, intersectPos)[0];
			vis.addCircle("feintGoalShot: KeeperTarget", keeperTargetPos, keeper.radius, vis.colors.cyan, false);
			let keeperTime = Physics.robotTimeToPos(keeper, keeperTargetPos, (keeperTargetPos - keeper.pos).withLength(keeper.maxSpeed))[0];
			if (keeper.speed.lengthSq() > 0.2 * 0.2) {
				debug.set("fast keeper", undefined);
				// Second possibility: intersection of current speed with shotLine (only if keeper is fast)
				let [intersection, _, _2] = geom.intersectLineLine(
					keeper.pos,
					keeper.speed,
					World.Ball.pos,
					(World.Ball.pos - this._robot.pos)
				);
				if (intersection !== undefined && Field.isInAllowedField(intersection, keeper.radius)) {
					vis.addCircle("feintGoalShot: KeeperTarget", intersection, keeper.radius, vis.colors.cyan, false);
					keeperTime = Math.min(keeperTime, Physics.robotTimeToPos(keeper, intersection, (intersection - keeper.pos).withLength(keeper.maxSpeed))[0]);
				}
			}

			debug.set("ballTime", ballTime);
			debug.set("keeperTime", keeperTime);

			if (ballTime < keeperTime - BALL_APPROACH_BUFFER) {
				return [ShootGoal];
			}
		}

		// Determine which corner we should look at to confuse the keeper
		let keeperIsLeft = keeper.pos.x < (this.lastKepperWasLeft ? World.Geometry.GoalWidth / 8 : -World.Geometry.GoalWidth / 8);
		let restart = this.lastKepperWasLeft !== keeperIsLeft;
		this.redecideCounter += restart ? 1 : 0;
		this.lastKepperWasLeft = keeperIsLeft;

		let target = keeperIsLeft ? World.Geometry.OpponentGoalRight : World.Geometry.OpponentGoalLeft;
		let moveToDest = World.Ball.pos - (target - World.Ball.pos).withLength(this._robot.shootRadius + 0.01);

		return [MoveToPos, [{ pos: moveToDest, dir: (target - World.Ball.pos).angle() }], restart];
	}
}
