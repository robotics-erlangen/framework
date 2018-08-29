import {Position} from "base/vector";
import * as World from "base/world";

import {Task, Agent} from "glados/task/base";
import {SuggestPass} from "glados/task/ability/suggestpass"
import * as PathHelper from "glados/trajectory/pathhelper";
import {ToTarget} from "glados/trajectory/totarget";

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

export class MoveToPos extends Task {
	private _pos: Position;
	private _dir: number;
	private _endSpeedLength: number;
	private _obstacleTable: PathHelper.PathHelperParameters;
	private _customObstacles: Obstacle[];
	private _suggestPass: SuggestPass | undefined;

	// customObstacles is a table of obstacle tables
	// An obstacle table contains a string field called type and parameters relevant for Path:addX
	// Type can be "circle", "line", "rect" and "triangle"
	constructor (agent: Agent, pos: Position, dir: number = (World.Ball.pos - pos).angle(), suggestPass: boolean = false,
			endSpeedLength: number = 0, ignoreDefaultObstacles: boolean = false, customObstacles: Obstacle[] = [],
			ignoreBallPlacement: boolean = false, ignoreBall: boolean = false) {
		super(agent);
		this._pos = pos;
		this._dir = dir;
		this._endSpeedLength = endSpeedLength;
		let ignore = ignoreDefaultObstacles;
		this._obstacleTable = {
			ignoreBall: ignore || ignoreBall,
			ignoreGoals: ignore,
			ignoreDefenseArea: ignore,
			ignoreOpponentDefenseArea: ignore,
			messaging: this._messaging,
			ignorePass: this._messaging == undefined || ignore,
	        ignoreBallPlacementObstacle: ignoreBallPlacement
		};
		this._customObstacles = customObstacles;

		if (suggestPass) {
			this._suggestPass = new SuggestPass(this._robot, this._messaging);
		}
	}

	public run () {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		for (let obstacle of this._customObstacles) {
			this._addCustomObstacle(obstacle);
		}

		let endSpeed = (this._pos - this._robot.pos).setLength(this._endSpeedLength);
		let time = this._robot.trajectory.update(ToTarget, this._pos, this._dir, undefined, endSpeed)[1];

		if (this._suggestPass != undefined) {
			this._suggestPass._suggestPassRobotPosition(this._pos, undefined, time);
		}
	}

	private _addCustomObstacle (obstInfo: Obstacle) {
		let path = this._robot.path;
		// If this gets changed, the comment before _init also needs to be updated
		if (obstInfo.type == "circle") {
			path.addCircle(obstInfo.x, obstInfo.y, obstInfo.radius, obstInfo.name);
		} else if (obstInfo.type == "line") {
			path.addLine(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.radius, obstInfo.name);
		} else if (obstInfo.type == "rect") {
			path.addRect(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.name);
		} else if (obstInfo.type == "triangle") {
			path.addTriangle(obstInfo.x1, obstInfo.y1, obstInfo.x2, obstInfo.y2, obstInfo.x3, obstInfo.y3, obstInfo.lineWidth, obstInfo.name);
		}
	}
}