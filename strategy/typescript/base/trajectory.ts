/**
 * @module Trajectory
 * Trajectory manager.
 */

/**************************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Andreas Wendler     *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, ||     *
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

import { Coordinates } from "base/coordinates";
import type { FriendlyRobot, TrajectoryCommand } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";

export interface RobotAccelerationProfile {
	aSpeedupFMax: number;
	aSpeedupSMax: number;
	aSpeedupPhiMax: number;
	aBrakeFMax: number;
	aBrakeSMax: number;
	aBrakePhiMax: number;
}

export type RobotLike = Pick<FriendlyRobot,
	"pos" | "dir"
	| "speed" | "maxSpeed"
	| "id" | "radius"
	| "isVisible"
	| "maxAngularSpeed" | "angularSpeed"
	| "acceleration" | "prevMoveTo" | "setControllerInput" | "path"
>;

/** A tuple consisting of
 *    - splines (controller tnput)
 *    - the desired target position
 *    - end position of the trajectory without violating any obstacles
 *    - time to reach that end position
 */
export type TrajectoryResult = [TrajectoryCommand, Position, Position, number];

/** Base class for trajectory planning */
export abstract class TrajectoryHandler {
	protected readonly _robot: RobotLike;

	public constructor(robot: RobotLike) {
		this._robot = robot;
	}

	/**
	 * checks whether trajectory handler is currently able to handle the new data
	 * or should be reseted
	 * canHandle is guaranteed to be called only after update was called at least once
	 */
	public abstract canHandle(...args: any[]): boolean;

	/**
	 * Data has to be in strategy coordinates!!! The trajectory module is responsible for the conversion
	 * between strategy and global coordinates!
	 * New data to use for updating, returns controllerInput, moveDest and moveTime
	 */
	public abstract update(...args: any[]): TrajectoryResult;
}


interface TrajH<T extends any[]> {
	update(...args: T): TrajectoryResult;
}
export class Trajectory {
	private readonly _robot: any;
	private _handler: TrajectoryHandler | undefined;

	/**
	 * Initialises trajectory manager.
	 * Must only be called by robot class!;
	 * @param robot - robot to handle
	 */
	public constructor(robot: RobotLike) {
		this._robot = robot;
	}

	/**
	 * Update trajectory.
	 * Resets handler if the trajectory type changes.
	 * Values passed to and returned from the trajectory handler <strong>must</strong> use strategy coordinates. The handler is responsible for doing any neccessary conversions!
	 * The handler has to return a protobuf.robot.Spline, Vector, number (controllerInput, moveDest, moveTime).
	 * @param handlerType - must be a subclass of Trajectory.Base
	 * @param args - passed on to trajectory handler
	 * @returns move destination and time as returned by the trajectory handler
	 */
	public update<T extends any[]>(handlerType: new (...a: any[]) => TrajH<T>, ...args: T): [Position, number] {
		if (this._handler == undefined || !(this._handler instanceof handlerType) || !this._handler.canHandle(...args)) {
			this._handler = new (handlerType as any)(this._robot);
			// mostly for the typechecker
			if (!this._handler) {
				throw new Error("Malformed trajectory handler constructor!");
			}
		}

		// target is the desired target position,
		// dest the position reached by path planning without violating any obstacles
		let [splines, target, dest, timeToDest] = this._handler.update(...args);

		let splin;
		if (splines.spline != undefined) {
			splin = splines.spline[0];
		}
		if (splin != undefined) {
			let xCalc = splin.x.a0 + splin.x.a1 * timeToDest + splin.x.a2 * timeToDest / 2;
			let yCalc = splin.y.a0 + splin.y.a1 * timeToDest + splin.y.a2 * timeToDest / 2;
			this._robot.prevMoveTo = Coordinates.toLocal(new Vector(xCalc, yCalc));
		} else {
			this._robot.prevMoveTo = undefined;
		}
		this._robot.setControllerInput(splines);
		if (this._robot.pos) {
			vis.addPath("MoveTo", [this._robot.pos, dest], vis.colors.whiteHalf);
			vis.addCircle("MoveTo", dest, this._robot.radius, vis.colors.yellowHalf, true);
			if (dest !== target) {
				vis.addPath("MoveTo", [this._robot.pos, target], vis.colors.orangeHalf);
				vis.addCircle("MoveTo", target, this._robot.radius, vis.colors.redHalf, true);
			}
		}
		return [dest, timeToDest];
	}
}

