import * as vis from "base/vis";
import {Vector, Position} from "base/vector";
import * as World from "base/world";
import {MessageType} from "glados/control/messaging";
import {SuggestPass} from "glados/task/ability/suggestpass";
import {Task, Agent} from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import {ToTarget} from "glados/trajectory/totarget";


export class AcceptPass extends Task {
	private _passPos: Position | undefined;
	private _distance: number;
	private _obstacleTable: PathHelper.PathHelperParameters;

	private _suggestPass: SuggestPass;

	constructor(agent: Agent, manualPassPos: Position | undefined, manualDistance: number = 0.1) {
		super(agent);
		this._passPos = manualPassPos;
		this._distance = manualDistance;
		this._obstacleTable = {
			ignoreBall: false,
			messaging: this._messaging,
		};
		this._suggestPass = new SuggestPass(this._robot, this._messaging);
	}

	run () {
		this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "striker", payload: {}});

		let passInfo = undefined;
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable == undefined) {
			throw new Error("AcceptPass runs although there is no passInfo message");
		}
		for (let pass of passInfoTable) {
			if (pass.target == this._robot || pass.target == undefined) {
				if (this._passPos == undefined || this._passPos.distanceTo(pass.ballPos) < this._distance) {
					if (passInfo != undefined) {
						throw new Error("AcceptPass doesn't know which pass to accept");
					}
					passInfo = pass;
				}
			}
		}
		if (passInfo == undefined) {
			throw new Error("AcceptPass runs despite not being a target");
		}
		vis.addCircle("t/striker", passInfo.ballPos, 0.1, vis.colors.turquoiseHalf, true)
		let ballPos = passInfo.ballPos
		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)

		let dir = (World.Ball.pos - ballPos).angle()
		let robotPos = ballPos - Vector.fromAngle(dir) * (this._robot.shootRadius + World.Ball.radius)
		let moveTime = this._robot.trajectory.update(ToTarget, robotPos, dir)[1];
		if (attackPosition) {
			this._suggestPass._suggestPass(ballPos, attackPosition, moveTime)
		}
		

		this.setMainAttackerParameters(World.Ball.pos, this._robot.maxSpeed)
	}
}