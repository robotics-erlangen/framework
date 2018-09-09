/*
 Path module provided by Ra. <br/>
 As every data value on the path object is set by the strategy, it would be possible to use strategy coordinates. This however would require further coordinate transformations as the generated controller input has to use global coordinates. <br/>
 Thus it is recommened to use global coordinates for everything stored in a path object.
 However the functions for adding obstacles require strategy coordinates and handle any neccessary conversions.
module "path"
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

/// Creates a new path planner object
// @class function
// @name path:create
// @return path - path object


// separator for luadoc//

/// Resets path planner object. Clears obstacles and waypoints. Field boundaries won't be changed
// @class function
// @name path:reset


// separator for luadoc//

/// Clears obstacles
// @class function
// @name path:clearObstacles


// separator for luadoc//

/// Set probabilities. Sum should be less or equal to 1
// @class function
// @param p_dest number - probability to extend towards destination
// @param p_waypoints numberr - probability to extend towards a previously generated waypoint
// @name path:setProbabilities


// separator for luadoc//

/// Sets field boundaries.
// The two points span up a rectangle whose borders are used as field boundaries. The boundaries must be specified in global coordinates.
// @class function
// @name path:setBoundary
// @param x1 number - bottom left
// @param y1 number
// @param x2 number - top right
// @param y2 number


// separator for luadoc//

/// Adds a circle as an obstacle.
// The circle <strong>must</strong> be passed in strategy coordinates!
// @class function
// @name path:addCircle
// @param x number - x coordinate of circle center
// @param y number - y coordinate of circle center
// @param radius number
// @param name string - name of the obstacle


// separator for luadoc//

/// Adds a line as an obstacle.
// The line <strong>must</strong> be passed in strategy coordinates!
// @class function
// @name path:addLine
// @param start_x number - x coordinate of line start point
// @param start_y number - y coordinate of line start point
// @param end_x number - x coordinate of line end point
// @param end_y number - y coordinate of line end point
// @param radius number - line width and start/end cap radius
// @param name string - name of the obstacle


// separator for luadoc//

/// Adds a rectangle as an obstacle.
// The rectangle <strong>must</strong> be passed in strategy coordinates!
// @class function
// @name path:addRect
// @param start_x number - x coordinate of bottom left corner
// @param start_y number - y coordinate of bottom left corner
// @param end_x number - x coordinate of upper right corner
// @param end_y number - y coordinate of upper right corner
// @param name string - name of the obstacle


// separator for luadoc//

/// Adds a triangle as an obstacle.
// The triangle <strong>must</strong> be passed in strategy coordinates!
// @class function
// @name path:addTriangle
// @param x1 number - x coordinate of the first point
// @param y1 number - y coordinate of the first point
// @param x2 number - x coordinate of the second point
// @param y2 number - y coordinate of the second point
// @param x3 number - x coordinate of the third point
// @param y3 number - y coordinate of the third point
// @param lineWidth number - extra distance
// @param name string - name of the obstacle


// separator for luadoc//

/// Tests a given path for collisions with any obstacle.
// The spline is based on the global coordinate system!
// @class function
// @name path:test
// @param path protobuf.robot.Spline
// @param radius number - minimum required corridor size
// @return bool isOk - true if no collision is detected


// separator for luadoc//

/// Sets robot radius for obstacle checking
// @class function
// @name path:setRadius
// @param radius number - minimum required corridor size


// separator for luadoc//

/// Generates a new path using RRT.
// Accounts for obstacles. The returned waypoints include the start point. This functions requires and returns global coordinates!
// @class function
// @name path:get
// @param start_x number - x coordinate of start point
// @param start_y number - y coordinate of start point
// @param end_x number - x coordinate of end point
// @param end_y number - y coordinate of end point
// @return {p_x, p_y, left, right}[] - waypoints and corridor widths for the way to a waypoint


// separator for luadoc//

/// Add a new target for seeding the RRT search tree.
// Seeding is done by rasterizing a path from rrt start to the given point
// @class function
// @name path:addSeedTarget
// @param x number - x coordinate of seed point
// @param y number - y coordinate of seed point


// separator for luadoc//

/// Generates a visualization of the tree.
// @class function
// @name path:addTreeVisualization

// luacheck: globals path
declare var path: any;
let pathLocal: any = path;

path = undefined;

import { log } from "base/amun";
import { Vector } from "base/vector";
import * as vis from "base/vis";

let teamIsBlue = amun.isBlue();
let isPerformanceMode = amun.getPerformanceMode();

export class Path {
	private readonly _inst: any;
	private readonly _robotId: number;
	constructor(robotId: number) {
		this._inst = pathLocal.create();
		this._robotId = robotId;
	}

	robotId() {
		return this._robotId;
	}

	getPath(x1: number, y1: number, x2: number, y2: number): any[] {
		return pathLocal.getPath(this._inst, x1, y1, x2, y2);
	}

	setProbabilities(a: number, b: number) {
		pathLocal.setProbabilities(this._inst, a, b);
	}

	setBoundary(x1: number, y1: number, x2: number, y2: number) {
		pathLocal.setBoundary(this._inst, x1, y1, x2, y2);
	}

	clearObstacles() {
		pathLocal.clearObstacles(this._inst);
	}

	setRadius(radius: number) {
		pathLocal.setRadius(this._inst, radius);
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
		pathLocal.addCircle(this._inst, x, y, radius, name, prio);
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
		pathLocal.addLine(this._inst, start_x, start_y, stop_x, stop_y, radius, name, prio);
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
		pathLocal.addRect(this._inst, start_x, start_y, stop_x, stop_y, name, prio);
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
		pathLocal.addTriangle(this._inst, x1, y1, x2, y2, x3, y3, lineWidth, name, prio);
	}

	addSeedTarget(x: number, y: number) {
		if (teamIsBlue) {
			x = -x;
			y = -y;
		}
		pathLocal.addSeedTarget(this._inst, x, y);
	}
}
