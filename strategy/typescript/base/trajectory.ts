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

/** Splines, target position, time to reach the target */
export type TrajectoryResult = [TrajectoryCommand, Position, number];

/** Base class for trajectory planning */
export abstract class TrajectoryHandler {
	protected readonly _robot: RobotLike;

	constructor(robot: RobotLike) {
		this._robot = robot;
	}

	/**
	 * checks whether trajectory handler is currently able to handle the new data
	 * or should be reseted
	 * canHandle is guaranteed to be called only after update was called at least once
	 */
	abstract canHandle(...args: any[]): boolean;

	/**
	 * Data has to be in strategy coordinates!!! The trajectory module is responsible for the conversion
	 * between strategy and global coordinates!
	 * New data to use for updating, returns controllerInput, moveDest and moveTime
	 */
	abstract update(...args: any[]): TrajectoryResult;
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
	constructor(robot: RobotLike) {
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
	update<T extends any[]>(handlerType: new (...a: any[]) => TrajH<T>, ...args: T): [Position, number] {
		if (this._handler == undefined || !(this._handler instanceof handlerType) || !this._handler.canHandle(...args)) {
			this._handler = new (handlerType as any)(this._robot);
			// mostly for the typechecker
			if (!this._handler) {
				throw new Error("Malformed trajectory handler constructor!");
			}
		}
		let [splines, moveDest, moveTime] = this._handler.update(...args);

		let splin;
		if (splines.spline != undefined) {
			splin = splines.spline[0];
		}
		if (splin != undefined) {
			let xCalc = splin.x.a0 + splin.x.a1 * moveTime + splin.x.a2 * moveTime / 2;
			let yCalc = splin.y.a0 + splin.y.a1 * moveTime + splin.y.a2 * moveTime / 2;
			this._robot.prevMoveTo = Coordinates.toLocal(new Vector(xCalc, yCalc));
		} else {
			this._robot.prevMoveTo = undefined;
		}
		this._robot.setControllerInput(splines);
		if (this._robot.pos) {
			vis.addPath("MoveTo", [this._robot.pos, moveDest], vis.colors.whiteHalf);
			vis.addCircle("MoveTo", moveDest, this._robot.radius, vis.colors.yellowHalf, true);
		}
		return [moveDest, moveTime];
	}
}

