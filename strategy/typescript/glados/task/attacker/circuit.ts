import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { SuggestPass } from "glados/task/ability/suggestpass";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


export class Circuit extends Task {
	private _suggestPass: SuggestPass;
	private _center: Position;
	private _angleOffset: number;
	private _radius: number;
	private _passPos: Position | undefined;
	private _anonym: boolean;
	private _obstacleTable : PathHelper.PathHelperParameters = {
		ignorePass: true
	};

	constructor(agent: Agent, center: Position, angleOffset: number, radius: number = 0.5, passPos?: Position, anonym: boolean = false) {
		super(agent);
		this._suggestPass = new SuggestPass(this._robot, this._messaging);
		this._center = center;
		this._angleOffset = angleOffset;
		this._radius = radius;
		this._passPos = passPos;
		this._anonym = anonym;
	}

	run() {
		let angle = (World.Time % 1000) % (Math.PI * 2) + this._angleOffset;
		let pos = this._center + Vector.fromAngle(angle) * this._radius;
		let dir = (World.Ball.pos - pos).angle();

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);
		this._robot.trajectory.update(ToTarget, pos, dir);

		if (this._passPos) {
			this._suggestPass._suggestPassRobotPosition(this._passPos, undefined, undefined, this._anonym);
		}
	}
}
