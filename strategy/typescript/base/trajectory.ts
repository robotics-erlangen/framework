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

import type { FriendlyRobot, TrajectoryCommand } from "base/robot";
import { Position } from "base/vector";
import * as vis from "base/vis";

export type RobotLike = Pick<FriendlyRobot,
	"pos" | "dir"
	| "speed" | "maxSpeed"
	| "id" | "radius"
	| "isVisible"
	| "maxAngularSpeed" | "angularSpeed"
	| "acceleration" | "moveTo" | "setControllerInput" | "path"
>;

/* The result of a trajectory handler. */
export interface TrajectoryResult {
	/** The controller input to be passed back to Amun. */
	trajectoryCommand: TrajectoryCommand;
	/** The desired target that was requested (might not be reachable because of obstacles for example). */
	target: Position;
	/** The end position of the actual trajectory without violating any obstacles. */
	dest: Position;
	/** The time to reach that end position. */
	timeToDest: number;
}

/**
 * Base class for trajectory handlers.
 */
export abstract class TrajectoryHandler<T extends any[]> {
	protected readonly _robot: RobotLike;

	public constructor(robot: RobotLike) {
		this._robot = robot;
	}

	/**
	 * Data has to be in strategy coordinates. The trajectory handler is responsible for the conversion
	 * between from strategy to global coordinates and back.
	 */
	public abstract update(...args: T): TrajectoryResult;
}

export class Trajectory {
	private readonly _robot: RobotLike;
	private _handler: TrajectoryHandler<any[]> | undefined;

	/**
	 * Initialises trajectory manager.
	 * Must only be called by robot class!
	 *
	 * @param robot - robot to handle
	 */
	public constructor(robot: RobotLike) {
		this._robot = robot;
	}

	/**
	 * Update trajectory.
	 *
	 * @param handlerType - must be a subclass of TrajectoryHandler
	 * @param args - passed on to the update method of the trajectory handler
	 * @returns destination and time as returned by the trajectory handler
	 */
	public update<T extends any[]>(handlerType: new (robot: RobotLike) => TrajectoryHandler<T>, ...args: T): [Position, number] {
		if (this._handler == undefined || !(this._handler instanceof handlerType)) {
			this._handler = new handlerType(this._robot);
		}

		const { trajectoryCommand, target, dest, timeToDest } = this._handler.update(...args);
		this._robot.moveTo = dest;
		this._robot.setControllerInput(trajectoryCommand);

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

