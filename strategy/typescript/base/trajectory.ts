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

import * as debug from "base/debug";
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

/**
 * The result of a trajectory handler (excluding the trajectory command, which is passed back to Amun).
 * This will be returned to the caller of {@link TrajectoryManager.update}.
 */
export abstract class TrajectoryResult {
	/** The desired target that was requested (might not be reachable because of obstacles for example). */
	protected readonly _robot: RobotLike;
	/**
	 * The end position of the actual trajectory without violating any obstacles,
	 * if that makes sense for the trajectory handler
	 */
	public abstract readonly dest?: Position;

	public constructor(robot: RobotLike) {
		this._robot = robot;
	}

	public debug() {}
	public vis() {}
}

/**
 * The result of a trajectory handler that combines information of reaching
 * a target position.
 */
export abstract class ToTargetResult extends TrajectoryResult {
	/** The desired target that was requested (might not be reachable because of obstacles for example). */
	public abstract readonly target: Position;
	/** The end position of the actual trajectory without violating any obstacles. */
	public abstract readonly dest: Position;
	/** The time to reach that end position. */
	public abstract readonly timeToDest: number;
	/** A sequence of points representing the path the robot is planning to take. */
	public abstract readonly path: Position[];

	/** True if the trajectory is not obstructed by obstacles. */
	public get reachesTarget(): boolean {
		/**
		 * This threshold is the maximum error between dest and target
		 * for the trajectory to be considered as reaching its target.
		 */
		const REACHES_TARGET_THRESHOLD = 0.01;
		return this.dest.distanceToSq(this.target) < REACHES_TARGET_THRESHOLD * REACHES_TARGET_THRESHOLD;
	}

	public debug() {
		debug.set("timeToDest", this.timeToDest);
		debug.set("reachesTarget", this.reachesTarget);
	}

	public vis() {
		if (this._robot.pos) {
			vis.addPath("MoveTo", this.path ?? [this._robot.pos, this.dest], vis.colors.whiteHalf);
			vis.addCircle("MoveTo", this.dest, this._robot.radius, vis.colors.yellowHalf, true);
			if (!this.reachesTarget) {
				vis.addPath("MoveTo", [this._robot.pos, this.target], vis.colors.orangeHalf);
				vis.addCircle("MoveTo", this.target, this._robot.radius, vis.colors.redHalf, true);
			}
		}
	}
}

/**
 * The result of a trajectory handler that has no return value.
 */
export class NoTrajectoryResult extends TrajectoryResult {
	public readonly dest: undefined = undefined;
}

/**
 * Base class for trajectory handlers.
 */
export abstract class TrajectoryHandler<Args extends any[], Ret extends TrajectoryResult> {
	protected readonly _robot: RobotLike;

	public constructor(robot: RobotLike) {
		this._robot = robot;
	}

	/**
	 * Data has to be in strategy coordinates. The trajectory handler is responsible for the conversion
	 * between from strategy to global coordinates and back.
	 */
	public abstract update(...args: Args): [TrajectoryCommand, Ret];
}

/**
 * Manages different trajectory handlers and reconstructs them if necessary.
 */
export class TrajectoryManager {
	private readonly _robot: RobotLike;
	private _handler: TrajectoryHandler<any[], TrajectoryResult> | undefined = undefined;

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
	public update<Args extends any[], Ret extends TrajectoryResult>(
			handlerType: new (robot: RobotLike) => TrajectoryHandler<Args, Ret>,
			...args: Args
	): Ret {
		if (this._handler == undefined || !(this._handler instanceof handlerType)) {
			this._handler = new handlerType(this._robot);
		}

		// at this point we can be should of the type of this._handler, but the type checker doesnt know this
		const handler = this._handler as TrajectoryHandler<Args, Ret>;
		const [trajectoryCommand, result] = handler.update(...args);
		this._robot.moveTo = result.dest;
		this._robot.setControllerInput(trajectoryCommand);

		result.vis();

		debug.push("Trajectory", handler.constructor.name);
		result.debug();
		debug.pop();

		return result;
	}
}

