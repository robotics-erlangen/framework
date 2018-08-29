import {Vector} from "base/vector";
import * as World from "base/world";
import {MessageType} from "glados/control/messaging";
import {Task, Agent} from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import {ToTarget} from "glados/trajectory/totarget";


export class MoveToStaticBall extends Task {
	private _rotation: number;
	private _distanceToBall: number;
	private _obstacleTable: PathHelper.PathHelperParameters;

	constructor (agent: Agent, rotation: number = Math.PI/2, distanceToBall: number = 0.03) {
		super(agent);
		this._rotation = rotation;
		this._distanceToBall = distanceToBall;
		this._obstacleTable = {extraBallDistance: this._distanceToBall, ignorePass: true, ignorePenaltyDistance: true}
	}

	run () {
		let absDistToBall = this._distanceToBall + this._robot.radius + World.Ball.radius
		let pos = World.Ball.pos - Vector.fromAngle(this._rotation) * absDistToBall

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

		this._robot.trajectory.update(ToTarget, pos, this._rotation)

		// send the position of the ball
		this._messaging.sendBroadcast(MessageType.attackPosition, World.Ball.pos);
	}
}