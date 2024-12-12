import { CubicBezierCurve, CubicBezierSpline } from "base/bezier";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";

enum ScatterMode {
	None,
	Full,
	Back
}

class BaseSnake extends Move {
	public static readonly NAME: string = "Snake";

	public static readonly MIN_ROBOTS: number = 2;
	public static readonly MAX_ROBOTS: number = 11;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	public static readonly TARGET_SPEED = 0.8;
	public static readonly ROT_SPEED = 0.5;
	public static readonly CORNER_RADIUS = 0.2;
	public static readonly ROBOT_SPACING = 0.3;

	private _nextTarget: number;
	private _nextTargetPos: Position;
	private _nextTargetRot: number;
	private _spline: CubicBezierSpline;
	private _headProgress: number;

	private _hasScattered: boolean = false;
	private _scatterPositions: Position[];

	public constructor(robots: FriendlyRobot[], messaging: MessageBox, scatter: ScatterMode) {
		super(robots, messaging);
		this._robots = robots.sort((a, b) => a.id < b.id ? 1 : -1);
		this._nextTarget = 1;
		this._nextTargetRot = 0;
		this._headProgress = 0;

		this._scatterPositions = new Array(this._robots.length);

		switch (scatter) {
			case ScatterMode.None:
				for (let i = 0; i < this._robots.length; i++) {
					this._scatterPositions[i] = this._robots[i].pos;
				}
				break;
			case ScatterMode.Full:
				let scatterSpacingFull = World.Geometry.FieldHeight / (this._robots.length + 1);
				for (let i = 0; i < this._robots.length; i++) {
					let xPos = -World.Geometry.FieldWidthHalf + (Math.random() * World.Geometry.FieldWidth);
					let scatterTryCount = -10;
					while (this._scatterPositions.some((p) => Math.abs(xPos - p.x) < 0.5 - (Math.max(0, scatterTryCount) * 0.05))) {
						xPos = -World.Geometry.FieldWidthHalf + (Math.random() * World.Geometry.FieldWidth);
						scatterTryCount++;
					}
					if (i % 2 === 0) {
						this._scatterPositions[i] = new Vector(xPos, -World.Geometry.FieldHeightHalf + (scatterSpacingFull * ((i + 1) / 2)));
					} else {
						this._scatterPositions[i] = new Vector(xPos, (scatterSpacingFull * ((i + 1) / 2)));
					}
				}
				break;
			case ScatterMode.Back:
				let scatterSpacingBack = World.Geometry.FieldWidth / (this._robots.length + 1);
				for (let i = 0; i < this._robots.length; i++) {
					let yPos = -World.Geometry.FieldHeightHalf + (Math.random() * World.Geometry.FieldHeightHalf);
					let scatterTryCount = -10;
					while (this._scatterPositions.some((p) => Math.abs(yPos - p.y) < 0.5 - (Math.max(0, scatterTryCount) * 0.05))) {
						yPos = -(World.Geometry.FieldHeightHalf - 0.5) + (Math.random() * (World.Geometry.FieldHeightHalf - 0.5));
						scatterTryCount++;
					}
					if (i % 2 === 0) {
						this._scatterPositions[i] = new Vector(-World.Geometry.FieldWidthHalf + (scatterSpacingBack * ((i + 1) / 2)), yPos);
					} else {
						this._scatterPositions[i] = new Vector((scatterSpacingBack * ((i + 1) / 2)), yPos);
					}
				}
				break;
		}

		let snakeHeadPos = this._scatterPositions[0];
		this._nextTargetPos = this._scatterPositions[1];
		this._spline = new CubicBezierSpline(new CubicBezierCurve(snakeHeadPos, snakeHeadPos, snakeHeadPos, snakeHeadPos));
		this._manualPlanNextPath(snakeHeadPos, this._nextTargetPos - snakeHeadPos, this._nextTargetPos);
	}

	public static canStart(): boolean {
		return true;
	}

	public canContinue(): boolean {
		return this._nextTarget < this._robots.length;
	}

	protected _updateTasks(): MoveParameters {
		this._spline.drawVisualization("VictorySnake", vis.colors.yellow, false);
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (!this._hasScattered) {
			this._hasScattered = true;
			for (let i = 0; i < this._robots.length; i++) {
				taskAssignments.set(this._robots[i], Assignment.create({ class: MoveToPos, params: [{ pos: this._scatterPositions[i], dir: 0, ignoreDefaultObstacles: true }] }));
				if (this._robots[i].pos.distanceToSq(this._scatterPositions[i]) > 0.01) {
					this._hasScattered = false;
				}
			}
			return {
				assignments: taskAssignments,
				mainAttacker: undefined,
			};
		}
		if (this._nextTarget === this._robots.length) {
			for (const r of this._robots) {
				taskAssignments.set(r, Assignment.create({ class: MoveToPos, params: [{ pos: r.pos, dir: 0, ignoreDefaultObstacles: true }] }));
			}
			return {
				assignments: taskAssignments,
				mainAttacker: undefined,
			};
		}

		this._headProgress += BaseSnake.TARGET_SPEED * World.TimeDiff;
		this._nextTargetRot += BaseSnake.ROT_SPEED * World.TimeDiff * 2 * Math.PI;

		// Plan path to next target
		if (this._spline.getPosByDist(this._headProgress).distanceTo(this._spline.getEndPos()) < BaseSnake.ROBOT_SPACING) {
			this._nextTarget++;
			if (this._nextTarget < this._robots.length) {
				this._nextTargetPos = this._robots[this._nextTarget].pos;
			}
			this._nextTargetRot = 0;
			// Only plan the next path when there are actually robots left
			if (this._nextTarget < this._robots.length) {
				this._headProgress += BaseSnake.ROBOT_SPACING;
				this._planNextPath();
			}
		}

		for (let i = 0; i < this._nextTarget; i++) {
			// Move snake
			let targetPos = this._spline.getPosByDist(this._headProgress - ((this._nextTarget - 1 - i) * BaseSnake.ROBOT_SPACING));
			let targetVel = this._spline.getDirByDist(this._headProgress - ((this._nextTarget - 1 - i) * BaseSnake.ROBOT_SPACING)).withLength(BaseSnake.TARGET_SPEED);
			// TODO: Custom Regelung mit TrajectoryDirect (verwende PID in trajectroy/trajectorypath.ts)
			taskAssignments.set(this._robots[i], Assignment.create({ class: MoveToPos, params: [{ pos: targetPos, dir: targetVel.angle(), endSpeedLength: targetVel.length(), ignoreDefaultObstacles: true }], restart: true }));
		}
		if (this._nextTarget < this._robots.length) {
			taskAssignments.set(this._robots[this._nextTarget], Assignment.create({ class: MoveToPos, params: [{ pos: this._nextTargetPos, dir: this._nextTargetRot, ignoreDefaultObstacles: true }], restart: true }));
		}
		for (let i = this._nextTarget + 1; i < this._robots.length; i++) {
			// Keep other robots in place
			taskAssignments.set(this._robots[i], Assignment.create({ class: MoveToPos, params: [{ pos: this._robots[i].pos, dir: 0, ignoreDefaultObstacles: true }] }));
		}

		return {
			assignments: taskAssignments,
			mainAttacker: undefined,
		};
	}

	private _planNextPath() {
		let prevEndPos = this._spline.getEndPos();
		let nextTargetPos = this._robots[this._nextTarget].pos;
		let prevDir = this._spline.getDirByU(this._spline.getSegmentCount());
		this._manualPlanNextPath(prevEndPos, prevDir, nextTargetPos);
	}

	private _manualPlanNextPath(prevEndPos: Position, prevDir: Vector, nextTargetPos: Position) {
		if (prevEndPos.distanceToSq(nextTargetPos) < 0.1) {
			return;
		}
		let diff = nextTargetPos - prevEndPos;
		let snappedPrevDir = Math.abs(prevDir.x) > Math.abs(prevDir.y) ? new Vector(prevDir.x, 0) : new Vector(0, prevDir.y);
		if (prevDir.dot(diff) > 0) {
			// Next robot in front -> Keep direction

			let actualCornerRadius = Math.min(BaseSnake.CORNER_RADIUS, Math.abs(diff.x), Math.abs(diff.y));
			let straightXLength = diff.x > 0 ? diff.x - actualCornerRadius : diff.x + actualCornerRadius;
			let straightYLength = diff.y > 0 ? diff.y - actualCornerRadius : diff.y + actualCornerRadius;
			if (Math.abs(prevDir.x) > Math.abs(prevDir.y)) {
				// Start in x
				if (Math.abs(straightXLength) > 0) {
					let straightXEndPos = new Vector(prevEndPos.x + straightXLength, prevEndPos.y);
					this._spline.addSegments(CubicBezierCurve.newLinear(prevEndPos, straightXEndPos));
				}
				let straightYStartPos = new Vector(nextTargetPos.x, nextTargetPos.y - straightYLength);
				this._spline.extendArc(straightYStartPos, new Vector(0, diff.y));
				if (Math.abs(straightYLength) > 0) {
					this._spline.addSegments(CubicBezierCurve.newLinear(straightYStartPos, nextTargetPos));
				}
			} else {
				// Start in y
				if (Math.abs(straightYLength) > 0) {
					let straightYEndPos = new Vector(prevEndPos.x, prevEndPos.y + straightYLength);
					this._spline.addSegments(CubicBezierCurve.newLinear(prevEndPos, straightYEndPos));
				}
				let straightXStartPos = new Vector(nextTargetPos.x - straightXLength, nextTargetPos.y);
				this._spline.extendArc(straightXStartPos, new Vector(diff.x, 0));
				if (Math.abs(straightXLength) > 0) {
					this._spline.addSegments(CubicBezierCurve.newLinear(straightXStartPos, nextTargetPos));
				}
			}
		} else {
			// Next robot behind -> Start in other axis

			// To the side
			let secondCurveEndpoint;
			if (Math.abs(prevDir.x) > Math.abs(prevDir.y)) {
				// Last moved in x
				let actualCornerRadius = Math.min(BaseSnake.CORNER_RADIUS, Math.abs(diff.y / 2));
				let signedCornerRadiusX = prevDir.x >= 0 ? actualCornerRadius : -actualCornerRadius;
				let signedCornerRadiusY = prevDir.x >= 0 === snappedPrevDir.dot(diff.perpendicular()) < 0 ? -actualCornerRadius : actualCornerRadius;
				let firstCurveEndpoint = new Vector(prevEndPos.x + signedCornerRadiusX, prevEndPos.y + signedCornerRadiusY);
				let lineEndpoint = new Vector(firstCurveEndpoint.x, nextTargetPos.y - signedCornerRadiusY);
				secondCurveEndpoint = new Vector(prevEndPos.x, nextTargetPos.y);

				this._spline.extendArc(firstCurveEndpoint, new Vector(0, signedCornerRadiusY));
				if (!firstCurveEndpoint.equals(lineEndpoint)) {
					this._spline.addSegments(CubicBezierCurve.newLinear(firstCurveEndpoint, lineEndpoint));
				}
				this._spline.extendArc(secondCurveEndpoint, nextTargetPos - secondCurveEndpoint);
			} else {
				// Last moved in y
				let actualCornerRadius = Math.min(BaseSnake.CORNER_RADIUS, Math.abs(diff.x / 2));
				let signedCornerRadiusY = prevDir.y >= 0 ? actualCornerRadius : -actualCornerRadius;
				let signedCornerRadiusX = prevDir.y >= 0 === snappedPrevDir.dot(diff.perpendicular()) < 0 ? actualCornerRadius : -actualCornerRadius;
				let firstCurveEndpoint = new Vector(prevEndPos.x + signedCornerRadiusX, prevEndPos.y + signedCornerRadiusY);
				let lineEndpoint = new Vector(nextTargetPos.x - signedCornerRadiusX, firstCurveEndpoint.y);
				secondCurveEndpoint = new Vector(nextTargetPos.x, prevEndPos.y);

				this._spline.extendArc(firstCurveEndpoint, new Vector(signedCornerRadiusX, 0));
				if (!firstCurveEndpoint.equals(lineEndpoint)) {
					this._spline.addSegments(CubicBezierCurve.newLinear(firstCurveEndpoint, lineEndpoint));
				}
				this._spline.extendArc(secondCurveEndpoint, nextTargetPos - secondCurveEndpoint);
			}

			// Back
			this._spline.addSegments(CubicBezierCurve.newLinear(secondCurveEndpoint, nextTargetPos));
		}
		// TODO: 3-segment Spline falls Ziel direkt zurück (der Schlange aus den Weg gehen)
	}
}

export class DirectSnake extends BaseSnake {
	public static readonly NAME: string = "Snake (Direct)";
	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging, ScatterMode.None);
	}
}

export class FullScatterSnake extends BaseSnake {
	public static readonly NAME: string = "Snake (Scatter Full)";
	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging, ScatterMode.Full);
	}
}

export class BackScatterSnake extends BaseSnake {
	public static readonly NAME: string = "Snake (Scatter Back)";
	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging, ScatterMode.Back);
	}
}
