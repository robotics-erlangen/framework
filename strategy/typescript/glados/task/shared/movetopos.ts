import { Position } from "base/vector";
import * as World from "base/world";

import { SuggestPass } from "glados/task/ability/suggestpass";
import { Agent, Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

interface CircleObstacle {
	type: "circle";
	x: number;
	y: number;
	radius: number;
	name: string;
}
interface LineObstacle {
	type: "line";
	start_x: number;
	start_y: number;
	end_x: number;
	end_y: number;
	radius: number;
	name: string;
}
interface RectObstacle {
	type: "rect";
	start_x: number;
	start_y: number;
	end_x: number;
	end_y: number;
	name: string;
}
interface TriangleObstacle {
	type: "triangle";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	x3: number;
	y3: number;
	lineWidth: number;
	name: string;
}
export type Obstacle = CircleObstacle | LineObstacle | RectObstacle | TriangleObstacle;

export type Parameters = {
	pos: Position,
	dir?: number,
	endSpeedLength?: number,
	customObstacles?: Obstacle[],
	suggestPass?: boolean,
	ignoreDefaultObstacles?: boolean,
	ignoreBallPlacement?: boolean
	ignoreBall?: boolean,
	useCMA?: boolean
};

export class MoveToPos extends Task {
	private _pos: Position;
	private _dir: number;
	private _endSpeedLength: number;
	private _obstacleTable: PathHelper.PathHelperParameters;
	private _customObstacles: Obstacle[];
	private _suggestPass: SuggestPass | undefined;
	private useCMA: boolean;

	// customObstacles is a table of obstacle tables
	// An obstacle table contains a string field called type and parameters relevant for Path:addX
	// Type can be "circle", "line", "rect" and "triangle"
	constructor(agent: Agent, params: Parameters) {
		super(agent);

		this._pos = params.pos;

		if (params.dir === undefined) {
			params.dir = (World.Ball.pos - params.pos).angle();
		}
		this._dir = params.dir;
		if (params.endSpeedLength === undefined) {
			params.endSpeedLength = 0;
		}
		this._endSpeedLength = params.endSpeedLength;
		if (params.customObstacles === undefined) {
			params.customObstacles = [];
		}
		this._customObstacles = params.customObstacles;

		const ignore = params.ignoreDefaultObstacles === true;
		this._obstacleTable = {
			ignoreBall: ignore || params.ignoreBall === true,
			ignoreDefenseArea: ignore,
			ignoreOpponentDefenseArea: ignore,
			messaging: this._messaging,
			ignorePass: this._messaging == undefined || ignore,
			ignoreBallPlacementObstacle: params.ignoreBallPlacement === true
		};

		if (params.suggestPass) {
			this._suggestPass = new SuggestPass(this._robot, this._messaging);
		}
		this.useCMA = params.useCMA === true;
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		for (let obstacle of this._customObstacles) {
			this._addCustomObstacle(obstacle);
		}

		let endSpeed = (this._pos - this._robot.pos).withLength(this._endSpeedLength);
		let time;
		if (this.useCMA) {
			time = this._robot.trajectory.update(CurvedMaxAccel, this._pos, this._dir, undefined, endSpeed)[1];
		} else {
			time = this._robot.trajectory.update(ToTarget, this._pos, this._dir, undefined, endSpeed)[1];
		}

		if (this._suggestPass != undefined) {
			this._suggestPass._suggestPassRobotPosition(this._pos, undefined, time);
		}
	}

	private _addCustomObstacle(obstInfo: Obstacle) {
		let path = this._robot.path;
		// If this gets changed, the comment before _init also needs to be updated
		if (obstInfo.type === "circle") {
			path.addCircle(obstInfo.x, obstInfo.y, obstInfo.radius, obstInfo.name);
		} else if (obstInfo.type === "line") {
			path.addLine(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.radius, obstInfo.name);
		} else if (obstInfo.type === "rect") {
			path.addRect(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.name);
		} else if (obstInfo.type === "triangle") {
			path.addTriangle(obstInfo.x1, obstInfo.y1, obstInfo.x2, obstInfo.y2, obstInfo.x3, obstInfo.y3, obstInfo.lineWidth, obstInfo.name);
		}
	}
}
