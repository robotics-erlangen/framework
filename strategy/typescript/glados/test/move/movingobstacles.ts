import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import { DirectDrive } from "glados/test/task/directdrive";
import * as PathHelper from "glados/trajectory/pathhelper";

class AlternatingObstacle {
	private _pos1: Position;
	private _pos2: Position;
	private _speed: number;
	private _startTime: number;
	private _totalTime: number;
	private _radius: number;

	// wayOffset is in percent
	public constructor(pos1: Position, pos2: Position, speed: number = 1, radius = 0.2, wayOffset: number = 0) {
		this._pos1 = pos1;
		this._pos2 = pos2;
		this._speed = speed;
		this._radius = radius;
		this._totalTime = pos1.distanceTo(pos2) / speed;
		this._startTime = World.Time - this._totalTime * wayOffset;
	}

	public update() {
		if (World.Time - this._startTime > this._totalTime) {
			[this._pos1, this._pos2] = [this._pos2, this._pos1];
			this._startTime = World.Time;
		}
	}

	public addAsMovingObstacle(robot: FriendlyRobot) {
		this.update();
		let startPos = this._pos1 + (this._pos2 - this._pos1) * ((World.Time - this._startTime) / this._totalTime);
		vis.addPath("moving obstacles test", [this._pos1, this._pos2], vis.colors.red);
		vis.addCircle("moving obstacles test", startPos, this._radius, vis.colors.red);
		let remainingTime = this._totalTime - (World.Time - this._startTime);
		let speedDirection = (this._pos2 - this._pos1).withLength(this._speed);
		robot.path.addMovingCircle(0, remainingTime, startPos, speedDirection, new Vector(0, 0), this._radius, 100);
	}
}

export class MovingObstacles extends Move {
	public static readonly MIN_ROBOTS: number = 1;
	public static readonly MAX_ROBOTS: number = 1;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	private _targetPos: Position = new Vector(0, World.Geometry.FieldHeightHalf * 0.7);
	private _obstacles: AlternatingObstacle[] = [];

	private _obstacleTable: PathHelper.PathHelperParameters = {
		ignoreBall: true,
		ignoreGoals: true,
		ignoreDefenseArea: true,
		ignoreOpponentDefenseArea: true,
		ignorePass: true,
		ignoreBallPlacementObstacle: true
	};

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		for (let i = 0; i <= 10; i++) {
			let y = (i - 5) / 1.5;
			this._obstacles.push(new AlternatingObstacle(new Vector(World.Geometry.FieldWidthHalf * 0.9, y),
				new Vector(-World.Geometry.FieldWidthHalf * 0.9, y), 1.5, 0.2, i / 12));
		}
	}

	public static canStart() {
		return true;
	}

	public canContinue(): boolean {
		return true;
	}

	protected _updateTasks(): MoveParameters {
		let changed = false;
		if (this._robots[0].pos.distanceTo(this._targetPos) < 0.05) {
			this._targetPos = this._targetPos * -1;
			changed = true;
		}

		PathHelper.setDefaultObstaclesByTable(this._robots[0].path, this._robots[0], this._obstacleTable);

		for (let o of this._obstacles) {
			o.addAsMovingObstacle(this._robots[0]);
		}

		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		taskAssignments[this._robots[0]] = Assignment.create({ class: DirectDrive, params: [this._targetPos], restart: changed });
		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}
}
