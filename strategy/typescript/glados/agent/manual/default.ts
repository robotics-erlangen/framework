import * as geom from "base/geom";
import {FriendlyRobot, UserControl} from "base/robot";
import {Position, Vector} from "base/vector";
import * as World from "base/world";

import {MessageType} from "glados/control/messaging";
import {Manual} from "glados/task/manual/manual"
import {Pass} from "glados/task/shared/pass";
import {ShootGoal} from "glados/task/attacker/shootgoal";
import {Behavior} from "glados/agent/base/behavior";
import {Task} from "glados/task/base";


export class Default extends Behavior {
	_shootTarget: {pos: Position} | undefined = undefined;

	_stop () {
		this._shootTarget = undefined
	}

	check (): boolean {
		this._applyForMainAttacker()
		return true
	}

	_chooseShootTarget () {
		let targets: {pos: Position}[] = [];

		targets.push({ pos: World.Geometry.OpponentGoal })
		for (let attacker of this._messaging.receive(MessageType.attackerFlag).keys()) {
			targets.push(attacker);
		}

		let bestTarget = undefined
		let bestTargetAngleDiff = Infinity
		for (let target of targets) {
			let targetAngleDiff = Math.abs(geom.normalizeAngle((target.pos - this._robot.pos).angle() - this._robot.dir));
			if (targetAngleDiff < bestTargetAngleDiff) {
				bestTarget = target;
				bestTargetAngleDiff = targetAngleDiff;
			}
		}

		this._shootTarget = bestTarget;
	}

	_shootBall (): [typeof Task, any[] | undefined] {
		if (this._shootTarget == undefined) {
			this._chooseShootTarget();
		}

		if ((this._shootTarget as {pos: Position}).pos == World.Geometry.OpponentGoal) {
			return [ShootGoal, undefined];
		} else {
			let target = <FriendlyRobot>this._shootTarget;
			let ballPos = target.pos + Vector.fromAngle(target.dir) * (World.Ball.radius + target.shootRadius)
			this._messaging.sendBroadcast(MessageType.passInfo, [{ target: target, ballPos: ballPos, time: World.Time }]);
			return [Pass, [ this._shootTarget ]];
		}
	}

	_updateTask (): [typeof Task, any[] | undefined] {
		let input = <UserControl>this._robot.userControl
		let requestBallFlag = input.dribblerSpeed && input.dribblerSpeed > 0
		let shootBallFlag = input.kickPower != undefined && input.kickPower > 0

		if (shootBallFlag && this._messaging.receiveTrainer(MessageType.mainAttacker) == this._robot) {
			return this._shootBall();
		} else {
			this._shootTarget = undefined;
		}

		if (requestBallFlag) {
			let ballPos = this._robot.pos + (World.Ball.pos - this._robot.pos).setLength(World.Ball.radius + this._robot.shootRadius)
			this._messaging.sendBroadcast(MessageType.passSuggestion, { ballPos: ballPos, time: 0 , manual: true, chip: false, anonymous: false });
		}

		return [Manual, undefined];
	}
}