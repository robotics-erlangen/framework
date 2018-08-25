import * as MathUtil from "base/mathutil";
import {Vector, Speed} from "base/vector";
import * as World from "base/world";
import {MessageType} from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import {Direct} from "glados/trajectory/direct";
import {Hidden} from "glados/trajectory/hidden";
import * as PathHelper from "glados/trajectory/pathhelper";
import {Task, Agent} from "glados/task/base";
import {Shoot} from "glados/task/ability/shoot";

const obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: true,
	ignoreDefenseArea: true,
	stopBallDistance: 0,
	ignoreOpponentDefenseArea: true,
	ignorePass :true
}

export class Manual extends Task {
	private _shoot: Shoot;

	constructor(agent: Agent) {
		super(agent);
		this._shoot = new Shoot(this._robot, this._messaging, this.setMainAttackerParameters);
	}

	_limitRobotSpeed (v: Speed) {
		let slowSpeed = 0.3;
		let fastSpeed = 2;
		let pos = this._robot.pos;

		let a = 2; // 1/a m is slow zone
		let kleft = MathUtil.bound(0, 1 - a*World.Geometry.FieldWidthHalf - a*pos.x, 1);
		let kright = MathUtil.bound(0, a*pos.x - a*World.Geometry.FieldWidthHalf + 1, 1);
		let kdown = MathUtil.bound(0, 1 - a*World.Geometry.FieldHeightHalf - a*pos.y, 1);
		let kup = MathUtil.bound(0, a*pos.y - a*World.Geometry.FieldHeightHalf + 1, 1);

		let khor = Math.max(kleft, kright);
		let kver = Math.max(kdown, kup);
		let k = Math.max(khor, kver);

		let vmax = k * slowSpeed + (1-k) * fastSpeed;

		let vlimited = v;
		if (v.length() > vmax) {
			vlimited = v.copy().setLength(vmax);
		}
		return vlimited;
	}

	run () {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		let input = this._robot.userControl;
		if (input == undefined) {
			throw new Error("task manuel can only be run with user control!");
		}

		if (input.kickPower && input.kickPower > 0 && Ball.friendlyBallOwner() == this._robot) {
			// shoot
			let shootDistance = 1.5;
			let shootPos = this._robot.pos + Vector.fromAngle(this._robot.dir).scaleLength(shootDistance);
			let linear = input.kickStyle === "linear";
			if (linear) {
				this._shoot._shoot(shootPos, Infinity);
			} else {
				this._shoot._chipToPos(shootPos);
			}
		} else if (!this._robot.isVisible) {
			let limitedSpeed = input.speed;
			if (limitedSpeed.length() > 0.3) {
				limitedSpeed = limitedSpeed.copy().setLength(0.3);
			}
			let omegamax = Math.PI/2;
			let omega = MathUtil.bound(-omegamax, input.omega, omegamax);
			this._robot.trajectory.update(Hidden, limitedSpeed.y, limitedSpeed.x, omega);
		} else {
			// don't let the robots crash
			let limitedSpeed = this._limitRobotSpeed(input.speed);
			this._robot.trajectory.update(Direct, limitedSpeed, undefined, input.omega);
		}

		// play attacker
		this._messaging.sendBroadcast(MessageType.attackerFlag);
	}
}