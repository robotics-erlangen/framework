/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";

abstract class MovingLogo extends Move {
	// All numbers must be positive, Points defined clockwise
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	protected readonly _logoPoints: Position[];

	private readonly _size: Vector;
	private _cornerMin: Position;
	private _cornerMax: Position;

	private _scale: number;
	private _currentPos: Position;
	private _velocity: Vector = new Vector(0.0035, 0.006);

	private _hasStarted: boolean = false;

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		let [logoPoints, scale, corner1, corner2] = this._provideParams();
		this._size = new Vector(
			logoPoints.reduce((prev, current) => current.x > prev.x ? current : prev).x,
			logoPoints.reduce((prev, current) => current.y > prev.y ? current : prev).y
		);
		this._logoPoints = logoPoints;
		this._scale = scale;

		this._cornerMin = new Vector(
			Math.min(corner1.x, corner2.x),
			Math.min(corner1.y, corner2.y)
		);
		this._cornerMax = new Vector(
			Math.max(corner1.x, corner2.x),
			Math.max(corner1.y, corner2.y)
		);

		let scaledSize: Vector = this._size * this._scale;
		let areaSize: Vector = this._cornerMax - this._cornerMin;
		if (areaSize.x < scaledSize.x || areaSize.y < scaledSize.y) {
			throw new Error(`Logo bounce-area (${areaSize.x.toFixed(2)},${areaSize.y.toFixed(2)})`
				+ ` too small for logo of size (${scaledSize.x.toFixed(2)},${scaledSize.y.toFixed(2)})`);
		}

		this._currentPos = (this._cornerMax + this._cornerMin - this._size) / 2;
	}

	public static canStart(): boolean {
		return true;
	}

	public canContinue(): boolean {
		return true;
	}

	// Points, Scale, BounceCorner1, BounceCorner2
	protected abstract _provideParams(): [Position[], number, Vector, Vector];

	protected _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (!this._hasStarted) {
			let allAtStartPos = true;
			for (let i = 0; i < this._robots.length; i++) {
				let startPos = this._logoPoints[i] * this._scale + this._currentPos;
				if (this._robots[i].pos.distanceToSq(startPos) > 0.2 ** 2 || this._robots[i].speed.lengthSq() > 0.1 ** 2) {
					allAtStartPos = false;
				}
				taskAssignments[this._robots[i]] = Assignment.create({ class: MoveToPos, params: [{ pos: startPos, dir: 0, ignoreDefaultObstacles: true }], restart: true });
			}
			this._hasStarted = allAtStartPos;
		} else {
			for (let i = 0; i < this._robots.length; i++) {
				let newPos = this._logoPoints[i] * this._scale + this._currentPos;
				taskAssignments[this._robots[i]] = Assignment.create({ class: MoveToPos, params: [{ pos: newPos, dir: 0, ignoreDefaultObstacles: true }], restart: true });
			}

			let scaledSize = this._size * this._scale;
			if (this._currentPos.x < this._cornerMin.x || this._currentPos.x + scaledSize.x > this._cornerMax.x) {
				this._velocity = new Vector(-this._velocity.x, this._velocity.y);
			}
			if (this._currentPos.y < this._cornerMin.y || this._currentPos.y + scaledSize.y > this._cornerMax.y) {
				this._velocity = new Vector(this._velocity.x, -this._velocity.y);
			}

			this._currentPos = this._currentPos + this._velocity;
		}

		return {
			assignments: taskAssignments,
			mainAttacker: undefined,
		};
	}
}

// ======== Owl Logo ========

const DVD_LOGO_POINTS = [
	// Head
	new Vector(0, 0.2),
	new Vector(0, 1.3),
	new Vector(0.6, 0.75),
	// Body
	new Vector(1.05, 0),
	new Vector(1.13, 0.7),
	new Vector(1.45, 1.25),
	new Vector(1.95, 1.6),
	new Vector(2.55, 1.7),
	new Vector(2.45, 1.15),
	new Vector(2.15, 0.6),
	new Vector(1.65, 0.17)
];

export class MovingOwlLogoBack extends MovingLogo {
	public static readonly NAME: string = "DVDOwl (Back)";

	public static readonly MIN_ROBOTS: number = DVD_LOGO_POINTS.length;
	public static readonly MAX_ROBOTS: number = DVD_LOGO_POINTS.length;

	protected _provideParams(): [Position[], number, Vector, Vector] {
		return [
			DVD_LOGO_POINTS,
			1.0,
			new Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf),
			new Vector(World.Geometry.FieldWidthHalf, 0)
		];
	}
}

export class MovingOwlLogoFull extends MovingLogo {
	public static readonly NAME: string = "DVDOwl (Full)";

	public static readonly MIN_ROBOTS: number = DVD_LOGO_POINTS.length;
	public static readonly MAX_ROBOTS: number = DVD_LOGO_POINTS.length;

	protected _provideParams(): [Position[], number, Vector, Vector] {
		return [
			DVD_LOGO_POINTS,
			1.0,
			new Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf),
			new Vector(World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf)
		];
	}
}
