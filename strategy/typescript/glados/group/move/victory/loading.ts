import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";

abstract class Loading extends Move {
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	private _center: Vector;
	private _radius: number;
	private _rotTime: number;

	private _hasStarted: boolean = false;
	private _time: number = 0;

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		let [center, radius, rotTime] = this._provideParams();
		this._center = center;
		this._radius = radius;
		this._rotTime = rotTime;
	}

	public static canStart() {
		return true;
	}

	public canContinue() {
		return true;
	}

	// Center, Radius, Full rotation time
	protected abstract _provideParams(): [Vector, number, number];

	private _circlePos(time: number): Vector {
		let linearProgress = time / this._rotTime;
		let angle = 2.57 * linearProgress + (3.81 * (Math.E ** (-2970 * (Math.E ** (-11.65 * linearProgress)))));
		let relPos = Vector.fromPolar(angle, this._radius);
		return this._center + new Vector(-relPos.x, relPos.y);
	}

	protected _updateTasks(): MoveParameters {
		let taskAssignments: Map<FriendlyRobot, Assignment> = new Map<FriendlyRobot, Assignment>();

		// Robots spread over the first quarter, where the movement is linear (First quarter is 2/3 of total time)
		let timeStep = (0.6 * this._rotTime) / this._robots.length;

		vis.addCircle("VictoryLoading", this._center, 0.05, vis.colors.cyan, true);
		vis.addCircle("VictoryLoading", this._center, this._radius, vis.colors.cyan, false);

		if (!this._hasStarted) {
			let allAtStartPos = true;
			for (let i = 0; i < this._robots.length; i++) {
				let startPos = this._circlePos(i * timeStep);
				if (this._robots[i].pos.distanceToSq(startPos) > 0.2 ** 2 || this._robots[i].speed.lengthSq() > 0.1) {
					allAtStartPos = false;
				}
				taskAssignments[this._robots[i]] = Assignment.create({ class: MoveToPos, params: [{ pos: startPos, ignoreDefaultObstacles: true }], restart: true });
			}
			this._hasStarted = allAtStartPos;
		} else {
			this._time += World.TimeDiff;
			for (let i = 0; i < this._robots.length; i++) {
				let newPos = this._circlePos((i * timeStep + this._time) % this._rotTime);
				taskAssignments[this._robots[i]] = Assignment.create({ class: MoveToPos, params: [{ pos: newPos, ignoreDefaultObstacles: true }], restart: true });
			}
		}

		return {
			assignments: taskAssignments,
			mainAttacker: undefined
		};
	}
}

export class LoadingCenter extends Loading {
	public static readonly NAME: string = "Loading (Center)";
	public static readonly MIN_ROBOTS: number = 2;
	public static readonly MAX_ROBOTS: number = 6;

	protected _provideParams(): [Vector, number, number] {
		return [
			new Vector(0, 0),
			1,
			10
		];
	}
}

export class LoadingBack extends Loading {
	public static readonly NAME: string = "Loading (Back)";
	public static readonly MIN_ROBOTS: number = 2;
	public static readonly MAX_ROBOTS: number = 6;

	protected _provideParams(): [Vector, number, number] {
		return [
			new Vector(0, 0.4 * -World.Geometry.FieldHeightHalf),
			1,
			10
		];
	}
}
