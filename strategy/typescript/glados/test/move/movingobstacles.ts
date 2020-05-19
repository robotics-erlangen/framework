import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import { DirectDrive } from "glados/test/task/directdrive";
import * as PathHelper from "glados/trajectory/pathhelper";

class AlternatingObstacle {
	private pos1: Position;
	private pos2: Position;
	private speed: number;
	private startTime: number;
	private totalTime: number;
	private radius: number;

	// wayOffset is in percent
	constructor(pos1: Position, pos2: Position, speed: number = 1, radius = 0.2, wayOffset: number = 0) {
		this.pos1 = pos1;
		this.pos2 = pos2;
		this.speed = speed;
		this.radius = radius;
		this.totalTime = pos1.distanceTo(pos2) / speed;
		this.startTime = World.Time - this.totalTime * wayOffset;
	}

	public update() {
		if (World.Time - this.startTime > this.totalTime) {
			[this.pos1, this.pos2] = [this.pos2, this.pos1];
			this.startTime = World.Time;
		}
	}

	public addAsMovingObstacle(robot: FriendlyRobot) {
		this.update();
		let startPos = this.pos1 + (this.pos2 - this.pos1).scaleLength((World.Time - this.startTime) / this.totalTime);
		vis.addPath("moving obstacles test", [this.pos1, this.pos2], vis.colors.red);
		vis.addCircle("moving obstacles test", startPos, this.radius, vis.colors.red);
		let remainingTime = this.totalTime - (World.Time - this.startTime);
		let speedDirection = (this.pos2 - this.pos1).withLength(this.speed);
		robot.path.addMovingCircle(0, remainingTime, startPos, speedDirection, new Vector(0, 0), this.radius, 100);
	}
}

export class MovingObstacles extends Move {
	public static MIN_ROBOTS: number = 1;
	public static MAX_ROBOTS: number = 1;
	public static ALLOW_EXTRA_ATTACKERS = false;

	private targetPos: Position = new Vector(0, World.Geometry.FieldHeightHalf * 0.7);
	private obstacles: AlternatingObstacle[] = [];

	private obstacleTable: PathHelper.PathHelperParameters = {
		ignoreBall: true,
		ignoreGoals: true,
		ignoreDefenseArea: true,
		ignoreOpponentDefenseArea: true,
		messaging: undefined,
		ignorePass: true,
		ignoreBallPlacementObstacle: true
	};

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		for (let i = 0;i <= 10;i++) {
			let y = (i - 5) / 1.5;
			this.obstacles.push(new AlternatingObstacle(new Vector(World.Geometry.FieldWidthHalf * 0.9, y),
				new Vector(-World.Geometry.FieldWidthHalf * 0.9, y), 1.5, 0.2, i / 12));
		}
	}

	static canStart() {
		return  true;
	}

	_canContinue() {
		return true;
	}

	_updateTasks(): MoveParameters {
		let changed = false;
		if (this._robots[0].pos.distanceTo(this.targetPos) < 0.05) {
			this.targetPos = this.targetPos * -1;
			changed = true;
		}

		PathHelper.setDefaultObstaclesByTable(this._robots[0].path, this._robots[0], this.obstacleTable);

		for (let o of this.obstacles) {
			o.addAsMovingObstacle(this._robots[0]);
		}

		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		taskAssignments[this._robots[0]] = { class: DirectDrive, params: [ this.targetPos ], restart: changed };
		return {
			assignments: taskAssignments,
			mainAttacker: this._robots[0]
		};
	}
}
