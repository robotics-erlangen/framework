/**
 * @module path
 *  Path module provided by Ra. <br/>
 *  As every data value on the path object is set by the strategy, it would be possible to use strategy coordinates. This however would require further coordinate transformations as the generated controller input has to use global coordinates. <br/>
 *  Thus it is recommened to use global coordinates for everything stored in a path object.
 *  However the functions for adding obstacles require strategy coordinates and handle any neccessary conversions.
 */

/**************************************************************************
*   Copyright 2018 Michael Eischer, Jan Kallwies, Philipp Nordhus,        *
*       Andreas Wendler                                                   *
*   Robotics Erlangen e.V.                                                *
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

import * as pb from "base/protobuf";

interface PathObjectCommon {
	destroy(): void;
	/** Resets path planner object. Clears obstacles and waypoints. Field boundaries won't be changed */
	reset(): void;
	clearObstacles(): void;
	/**
	 * Sets field boundaries.
	 * The two points span up a rectangle whose borders are used as field boundaries. The boundaries must be specified in global coordinates.
	 * @param x1 x coordinate bottom left
	 * @param y1 y coordinate bottom left
	 * @param x2 x coordinate top left
	 * @param y2 y coordinate top left
	 */
	setBoundary(x1: number, y1: number, x2: number, y2: number): void;
	/**
	 * Sets robot radius for obstacle checking
	 * @param radius minimum required corridor size
	 */
	setRadius(radius: number): void;
	/**
	 * Adds a circle as an obstacle.
	 * The circle MUST be passed in strategy coordinates!
	 * @param x x coordinate of circle center
	 * @param y y coordinate of circle center
	 * @param radius circle radius
	 * @param name name of the obstacle
	 * @param priority priority of the obstacle
	 */
	addCircle(x: number, y: number, radius: number, name: string | undefined, priority: number): void;
	/**
	 * Adds a line as an obstacle.
	 * The line MUST be passed in strategy coordinates!
	 * @param start_x x coordinate of line start point
	 * @param start_y y coordinate of line start point
	 * @param end_x x coordinate of line end point
	 * @param end_y y coordinate of line end point
	 * @param name obstacle name
	 * @param radius line width and start/end cap radius
	 * @param priority priority of the obstacle
	 */
	addLine(start_x: number, start_y: number, end_x: number, end_y: number,
		radius: number, name: string | undefined, priority: number): void;
	/**
	 * Adds a rectangle as an obstacle.
	 * The rectangle MUST be passed in strategy coordinates!
	 * @param start_x x coordinate of bottom left corner
	 * @param start_y y coordinate of bottom left corner
	 * @param end_x x coordinate of upper right corner
	 * @param end_y y coordinate of upper right corner
	 * @param name name of the obstacle
	 * @param priority obstacle priority
	 */
	addRect(start_x: number, start_y: number, end_x: number, end_y: number,
		name: string | undefined, priority: number): void;
	/**
	 * Adds a triangle as an obstacle.
	 * The triangle MUST be passed in strategy coordinates!
	 * @param x1 x coordinate of the first point
	 * @param y1 y coordinate of the first point
	 * @param x2 x coordinate of the second point
	 * @param y2 y coordinate of the second point
	 * @param x3 x coordinate of the third point
	 * @param y3 y coordinate of the third point
	 * @param lineWidth extra distance
	 * @param name name of the obstacle
	 * @param priority obstacle priority
	 */
	addTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
		lineWidth: number, name: string | undefined, priority: number): void;
}

interface PathObjectRRT extends PathObjectCommon {
	/**
	 * Set probabilities. Sum should be less or equal to 1
	 * @param p_dest probability to extend towards destination
	 * @param p_waypoints probability to extend towards a previously generated waypoint
	 */
	setProbabilities(p_dest: number, p_waypoints: number): void;
	/**
	 * Add a new target for seeding the RRT search tree.
	 * Seeding is done by rasterizing a path from rrt start to the given point
	 * @param x x coordinate of seed point
	 * @param y y coordinate of seed point
	 */
	addSeedTarget(x: number, y: number): void;
	/**
	 * Tests a given path for collisions with any obstacle.
	 * The spline is based on the global coordinate system!
	 * @param path minimum required corridor size
	 * @param radius radius
	 * @returns true if no collision is detected
	 */
	test(path: pb.robot.Spline, radius: number): boolean;
	/**
	 * Generates a new path using RRT.
	 * Accounts for obstacles. The returned waypoints include the start point. This functions requires and returns global coordinates!
	 * @param start_x x coordinate of start point
	 * @param start_y y coordinate of start point
	 * @param end_x x coordinate of end point
	 * @param end_y y coordinate of end point
	 * @returns [p_x, p_y, left, right][] - waypoints and corridor widths for the way to a waypoint
	 */
	getPath(start_x: number, start_y: number, end_x: number, end_y: number): [number, number, number, number][];
	/** Generates a visualization of the tree. */
	addTreeVisualization(): void;
}

interface AmunPath {
	/** Create a new RRT path planner object */
	createPath(): PathObjectRRT;
}

declare var path: any;
let pathLocal: any = path;

path = undefined;

import { log } from "base/amun";
import { Vector } from "base/vector";
import * as vis from "base/vis";

let teamIsBlue = amun.isBlue();
let isPerformanceMode = amun.getPerformanceMode();

// only to be used for unit tests
export function getOriginalPath(): any {
	return pathLocal;
}

export class Path {
	private readonly _inst: PathObjectRRT;
	private readonly _robotId: number;
	constructor(robotId: number) {
		this._inst = pathLocal.createPath();
		this._robotId = robotId;
	}

	robotId() {
		return this._robotId;
	}

	getPath(x1: number, y1: number, x2: number, y2: number): [number, number, number, number][] {
		return this._inst.getPath(x1, y1, x2, y2);
	}

	setProbabilities(a: number, b: number) {
		this._inst.setProbabilities(a, b);
	}

	setBoundary(x1: number, y1: number, x2: number, y2: number) {
		this._inst.setBoundary(x1, y1, x2, y2);
	}

	clearObstacles() {
		this._inst.clearObstacles();
	}

	setRadius(radius: number) {
		this._inst.setRadius(radius);
	}

	// wrap add obstacle functions for automatic strategy to global coordinates conversion
	addCircle(x: number, y: number, radius: number, name?: string, prio: number = 0) {
		if (teamIsBlue) {
			x = -x;
			y = -y;
		}
		if (!isPerformanceMode) {
			vis.addCircleRaw(`obstacles: ${this._robotId}`, new Vector(x, y), radius, vis.colors.redHalf, true);
		} else {
			// avoid string allocations in ra
			name = undefined;
		}
		this._inst.addCircle(x, y, radius, name, prio);
	}

	addLine(start_x: number, start_y: number, stop_x: number, stop_y: number, radius: number, name?: string, prio: number = 0) {
		if (start_x === stop_x && start_y === stop_y) {
			log("WARNING: start  &&  end points for a line obstacle are the same!");
			return;
		}
		if (teamIsBlue) {
			start_x = -start_x;
			start_y = -start_y;
			stop_x = -stop_x;
			stop_y = -stop_y;
		}
		if (!isPerformanceMode) {
			vis.addPathRaw(`obstacles: ${this._robotId}`, [new Vector(start_x, start_y), new Vector(stop_x, stop_y)],
					vis.colors.redHalf, undefined, undefined, 2 * radius);
		} else {
			// avoid string allocations in ra
			name = undefined;
		}
		this._inst.addLine(start_x, start_y, stop_x, stop_y, radius, name, prio);
	}

	addRect(start_x: number, start_y: number, stop_x: number, stop_y: number, name?: string, prio: number = 0) {
		if (teamIsBlue) {
			start_x = -start_x;
			start_y = -start_y;
			stop_x = -stop_x;
			stop_y = -stop_y;
		}
		if (!isPerformanceMode) {
			vis.addPolygonRaw(`obstacles: ${this._robotId}`,
					[new Vector(start_x, start_y), new Vector(start_x, stop_y), new Vector(stop_x, stop_y),
					new Vector(stop_x, start_y)], vis.colors.redHalf, true);
		} else {
			// avoid string allocations in ra
			name = undefined;
		}
		this._inst.addRect(start_x, start_y, stop_x, stop_y, name, prio);
	}

	addTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
			lineWidth: number, name?: string, prio: number = 0) {
		if (teamIsBlue) {
			x1 = -x1;
			y1 = -y1;
			x2 = -x2;
			y2 = -y2;
			x3 = -x3;
			y3 = -y3;
		}
		if (!isPerformanceMode) {
			let p1 = new Vector(x1, y1);
			let p2 = new Vector(x2, y2);
			let p3 = new Vector(x3, y3);
			vis.addPolygonRaw(`obstacles: ${this._robotId}`, [p1, p2, p3], vis.colors.redHalf, true);
		} else {
			// avoid string allocations in ra
			name = undefined;
		}
		this._inst.addTriangle(x1, y1, x2, y2, x3, y3, lineWidth, name, prio);
	}

	addSeedTarget(x: number, y: number) {
		if (teamIsBlue) {
			x = -x;
			y = -y;
		}
		this._inst.addSeedTarget(x, y);
	}
}

