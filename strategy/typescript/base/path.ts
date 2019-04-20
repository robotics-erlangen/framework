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

import { log } from "base/amun";
import { Coordinates } from "base/coordinates";
import * as pb from "base/protobuf";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";

interface Obstacle {
	name: string | undefined;
	prio: number;
}

interface CircleObstacle extends Obstacle {
	x: number;
	y: number;
	radius: number;
}

interface LineObstacle extends Obstacle {
	start_x: number;
	start_y: number;
	stop_x: number;
	stop_y: number;
	radius: number;
}

interface RectObstacle extends Obstacle {
	start_x: number;
	start_y: number;
	stop_x: number;
	stop_y: number;
}

interface TriangleObstacle extends Obstacle {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	x3: number;
	y3: number;
	lineWidth: number;
}

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

type TrajectoryPathResult = {
	px: number;
	py: number;
	vx: number;
	vy: number;
	time: number;
}[];

interface PathObjectTrajectory extends PathObjectCommon {
	calculateTrajectory(startX: number, startY: number, startSpeedX: number, startSpeedY: number,
		endX: number, endY: number, endSpeedX: number, endSpeedY: number, maxSpeed: number, acceleration: number): TrajectoryPathResult;

	// uses relative times
	addMovingCircle(startTime: number, endTime: number, startX: number, startY: number, speedX: number,
		speedY: number, radius: number, priority: number): void;
}

interface AmunPath {
	/** Create a new RRT path planner object */
	createPath(): PathObjectRRT;
	/** Create a new trajectory path planner object */
	createTrajectoryPath(): PathObjectTrajectory;
}

declare var path: any;
let pathLocal: any = path;

path = undefined;

let teamIsBlue = amun.isBlue();
let isPerformanceMode = amun.getPerformanceMode();

// only to be used for unit tests
export function getOriginalPath(): any {
	return pathLocal;
}

export class Path {
	private readonly _inst: PathObjectRRT;
	private readonly _trajectoryInst: PathObjectTrajectory;
	private readonly _robotId: number;

	private circleObstacles: CircleObstacle[] = [];
	private lineObstacles: LineObstacle[] = [];
	private rectObstacles: RectObstacle[] = [];
	private triangleObstacles: TriangleObstacle[] = [];

	constructor(robotId: number) {
		this._inst = pathLocal.createPath();
		this._trajectoryInst = pathLocal.createTrajectoryPath();
		this._robotId = robotId;
	}

	robotId() {
		return this._robotId;
	}

	private addObstaclesToPath(path: PathObjectCommon) {
		for (let circle of this.circleObstacles) {
			path.addCircle(circle.x, circle.y, circle.radius, circle.name, circle.prio);
		}
		for (let line of this.lineObstacles) {
			path.addLine(line.start_x, line.start_y, line.stop_x, line.stop_y,
				line.radius, line.name, line.prio);
		}
		for (let rect of this.rectObstacles) {
			path.addRect(rect.start_x, rect.start_y, rect.stop_x, rect.stop_y, rect.name, rect.prio);
		}
		for (let tri of this.triangleObstacles) {
			path.addTriangle(tri.x1, tri.y1, tri.x2, tri.y2, tri.x3, tri.y3, tri.lineWidth,
				tri.name, tri.prio);
		}
	}

	getTrajectory(startPos: Position, startSpeed: Speed, endPos: Position, endSpeed: Speed, maxSpeed: number, acceleration: number): { pos: Position, speed: Speed, time: number}[] {
		this.addObstaclesToPath(this._trajectoryInst);
		let t = this._trajectoryInst.calculateTrajectory(startPos.x, startPos.y, startSpeed.x,
			startSpeed.y, endPos.x, endPos.y, endSpeed.x, endSpeed.y, maxSpeed, acceleration);
		let result: { pos: Position, speed: Speed, time: number }[] = [];
		for (let p of t) {
			result.push({ pos: new Vector(p.px, p.py), speed: new Vector(p.vx, p.vy), time: p.time});
		}
		return result;
	}

	getPath(x1: number, y1: number, x2: number, y2: number): [number, number, number, number][] {
		this.addObstaclesToPath(this._inst);
		return this._inst.getPath(x1, y1, x2, y2);
	}

	setProbabilities(a: number, b: number) {
		this._inst.setProbabilities(a, b);
	}

	setBoundary(x1: number, y1: number, x2: number, y2: number) {
		this._inst.setBoundary(x1, y1, x2, y2);
		this._trajectoryInst.setBoundary(x1, y1, x2, y2);
	}

	clearObstacles() {
		this._inst.clearObstacles();
		this._trajectoryInst.clearObstacles();
		this.circleObstacles.length = 0;
		this.lineObstacles.length = 0;
		this.rectObstacles.length = 0;
		this.triangleObstacles.length = 0;
	}

	setRadius(radius: number) {
		this._inst.setRadius(radius);
		this._trajectoryInst.setRadius(radius);
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
		this.circleObstacles.push({x: x, y: y, radius: radius, name: name, prio: prio});
	}

	/** WARNING: only adds the obstacle to the trajectory path finding */
	addMovingCircle(startTime: number, endTime: number, startPos: Position, speed: Speed, radius: number, priority: number) {
		startPos = Coordinates.toGlobal(startPos);
		speed = Coordinates.toGlobal(speed);

		if (!isPerformanceMode) {
			let endPos = startPos + speed * (endTime - startTime);
			vis.addCircleRaw(`obstacles: ${this._robotId}`, startPos, radius, vis.colors.orangeHalf, true);
			vis.addCircleRaw(`obstacles: ${this._robotId}`, endPos, radius, vis.colors.orangeHalf, true);
			vis.addPathRaw(`obstacles: ${this._robotId}`, [startPos, endPos], vis.colors.orangeHalf);
		}

		this._trajectoryInst.addMovingCircle(startTime, endTime, startPos.x, startPos.y,
			speed.x, speed.y, radius, priority);
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
		this.lineObstacles.push({start_x: start_x, start_y: start_y, stop_x: stop_x, stop_y: stop_y,
			radius: radius, name: name, prio: prio});
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
		this.rectObstacles.push({start_x: start_x, start_y: start_y, stop_x: stop_x, stop_y: stop_y,
			name: name, prio: prio});
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
		this.triangleObstacles.push({x1: x1, y1: y1, x2: x2, y2: y2, x3: x3, y3: y3,
			lineWidth: lineWidth, name: name, prio: prio});
	}

	addSeedTarget(x: number, y: number) {
		if (teamIsBlue) {
			x = -x;
			y = -y;
		}
		this._inst.addSeedTarget(x, y);
	}
}

