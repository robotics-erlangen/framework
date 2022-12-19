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
import * as Option from "base/option";
import * as pb from "base/protobuf";
import { FriendlyRobot, Robot } from "base/robot";
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
	radius: number;
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
	 * @param x1 - x coordinate bottom left
	 * @param y1 - y coordinate bottom left
	 * @param x2 - x coordinate top left
	 * @param y2 - y coordinate top left
	 */
	setBoundary(x1: number, y1: number, x2: number, y2: number): void;
	/**
	 * Sets robot radius for obstacle checking
	 * @param radius - minimum required corridor size
	 */
	setRadius(radius: number): void;
	/**
	 * Adds a circle as an obstacle.
	 * The circle MUST be passed in strategy coordinates!
	 * @param x - x coordinate of circle center
	 * @param y - y coordinate of circle center
	 * @param radius - circle radius
	 * @param name - name of the obstacle
	 * @param priority - priority of the obstacle
	 */
	addCircle(x: number, y: number, radius: number, name: string | undefined, priority: number): void;
	/**
	 * Adds a line as an obstacle.
	 * The line MUST be passed in strategy coordinates!
	 * @param start_x - x coordinate of line start point
	 * @param start_y - y coordinate of line start point
	 * @param end_x - x coordinate of line end point
	 * @param end_y - y coordinate of line end point
	 * @param name - obstacle name
	 * @param radius - line width and start/end cap radius
	 * @param priority - priority of the obstacle
	 */
	addLine(start_x: number, start_y: number, end_x: number, end_y: number,
		radius: number, name: string | undefined, priority: number): void;
	/**
	 * Adds a rectangle as an obstacle.
	 * The rectangle MUST be passed in strategy coordinates!
	 * @param start_x - x coordinate of bottom left corner
	 * @param start_y - y coordinate of bottom left corner
	 * @param end_x - x coordinate of upper right corner
	 * @param end_y - y coordinate of upper right corner
	 * @param name - name of the obstacle
	 * @param priority - obstacle priority
	 * @param radius - an extra radius around the rectangle to count as obstacle
	 */
	addRect(start_x: number, start_y: number, end_x: number, end_y: number,
		name: string | undefined, priority: number, radius: number): void;
	/**
	 * Adds a triangle as an obstacle.
	 * The triangle MUST be passed in strategy coordinates!
	 * @param x1 - x coordinate of the first point
	 * @param y1 - y coordinate of the first point
	 * @param x2 - x coordinate of the second point
	 * @param y2 - y coordinate of the second point
	 * @param x3 - x coordinate of the third point
	 * @param y3 - y coordinate of the third point
	 * @param lineWidth - extra distance
	 * @param name - name of the obstacle
	 * @param priority - obstacle priority
	 */
	addTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
		lineWidth: number, name: string | undefined, priority: number): void;

	/** Seeds the random number generator used for the path finding */
	seedRandom(seed: number): void;
}

/**
 * Waypoints and corridor widths for the way to a waypoint
 *
 * Waypoint[0]: p_x
 * Waypoint[1]: p_y
 * Waypoint[2]: left
 * Waypoint[3]: right
 */
export type Waypoint = [number, number, number, number];

interface PathObjectRRT extends PathObjectCommon {
	/**
	 * Set probabilities. Sum should be less or equal to 1
	 * @param p_dest - probability to extend towards destination
	 * @param p_waypoints - probability to extend towards a previously generated waypoint
	 */
	setProbabilities(p_dest: number, p_waypoints: number): void;
	/**
	 * Add a new target for seeding the RRT search tree.
	 * Seeding is done by rasterizing a path from rrt start to the given point
	 * @param x - x coordinate of seed point
	 * @param y - y coordinate of seed point
	 */
	addSeedTarget(x: number, y: number): void;
	/**
	 * Tests a given path for collisions with any obstacle.
	 * The spline is based on the global coordinate system!
	 * @param path - minimum required corridor size
	 * @param radius - radius (must be the robot radius)
	 * @returns true if no collision is detected
	 */
	test(path: pb.robot.Spline, radius: number): boolean;
	/**
	 * Generates a new path using RRT.
	 * Accounts for obstacles. The returned waypoints include the start point. This functions requires and returns global coordinates!
	 * @param start_x - x coordinate of start point
	 * @param start_y - y coordinate of start point
	 * @param end_x - x coordinate of end point
	 * @param end_y - y coordinate of end point
	 * @returns [p_x, p_y, left, right][] - waypoints and corridor widths for the way to a waypoint
	 */
	getPath(start_x: number, start_y: number, end_x: number, end_y: number): Waypoint[];
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

// just some impossible to create type, is actually a C++ external
type TrajectoryObstacle = number & { _tag: "Trajectory obstacle" };

interface PathObjectTrajectory extends PathObjectCommon {
	calculateTrajectory(startX: number, startY: number, startSpeedX: number, startSpeedY: number,
		endX: number, endY: number, endSpeedX: number, endSpeedY: number, maxSpeed: number, acceleration: number): TrajectoryPathResult;

	// uses relative times
	addMovingCircle(startTime: number, endTime: number, startX: number, startY: number, speedX: number,
		speedY: number, accX: number, accY: number, radius: number, priority: number): void;

	addMovingLine(startPosX1: number, startPosY1: number, speedX1: number, speedY1: number, accX1: number,
		accY1: number, startPosX2: number, startPosY2: number, speedX2: number, speedY2: number,
		accX2: number, accY2: number, startTime: number, endTime: number, width: number, prio: number): void;

	setOutOfFieldPrio(prio: number): void;
	getTrajectoryAsObstacle(): TrajectoryObstacle;
	addRobotTrajectoryObstacle(obstacle: TrajectoryObstacle, priority: number, radius: number): void;
	maxIntersectingObstaclePrio(): number;
	setRobotId?(id: number): void;
	addOpponentRobotObstacle?(startX: number, startY: number, speedX: number, speedY: number, prio: number): void;
}

interface AmunPath {
	/** Create a new RRT path planner object */
	createPath(): PathObjectRRT;
	/** Create a new trajectory path planner object */
	createTrajectoryPath(): PathObjectTrajectory;
}

declare let path: any;
let pathLocal: any = path;

path = undefined;

let teamIsBlue = amun.isBlue();
let isPerformanceMode = amun.getPerformanceMode();

// enables a more expensive, but also a little more
// useful visualization for moving lines
const USE_NEW_MOVING_LINE_VIS = Option.addOption("Use new moving line visualization", false);

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

	private lastWasTrajectoryPath: boolean = false;

	constructor(robotId: number) {
		this._inst = pathLocal.createPath();
		this._trajectoryInst = pathLocal.createTrajectoryPath();
		if (this._trajectoryInst.setRobotId) {
			this._trajectoryInst.setRobotId(robotId);
		}
		this._robotId = robotId;
	}

	robotId() {
		return this._robotId;
	}

	public seedRandom(seed: number) {
		this._inst.seedRandom(seed);
		this._trajectoryInst.seedRandom(seed);
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
			path.addRect(rect.start_x, rect.start_y, rect.stop_x, rect.stop_y, rect.name, rect.prio, rect.radius);
		}
		for (let tri of this.triangleObstacles) {
			path.addTriangle(tri.x1, tri.y1, tri.x2, tri.y2, tri.x3, tri.y3, tri.lineWidth,
				tri.name, tri.prio);
		}
	}

	private getObstacleString() {
		let teamLetter = "y";
		if (teamIsBlue) {
			teamLetter = "b";
		}
		return `obstacles: ${this._robotId}${teamLetter}`;
	}

	setHalted() {
		this.lastWasTrajectoryPath = false;
	}

	getTrajectory(startPos: Position, startSpeed: Speed, endPos: Position, endSpeed: Speed, maxSpeed: number, acceleration: number): { pos: Position; speed: Speed; time: number }[] {
		this.lastWasTrajectoryPath = true;
		this.addObstaclesToPath(this._trajectoryInst);
		let t = this._trajectoryInst.calculateTrajectory(startPos.x, startPos.y, startSpeed.x,
			startSpeed.y, endPos.x, endPos.y, endSpeed.x, endSpeed.y, maxSpeed, acceleration);
		let result: { pos: Position; speed: Speed; time: number }[] = [];
		for (let p of t) {
			result.push({ pos: new Vector(p.px, p.py), speed: new Vector(p.vx, p.vy), time: p.time });
		}
		return result;
	}

	getPath(x1: number, y1: number, x2: number, y2: number): Waypoint[] {
		this.lastWasTrajectoryPath = false;
		this.addObstaclesToPath(this._inst);
		return this._inst.getPath(x1, y1, x2, y2);
	}

	lastFrameWasTrajectoryPath(): boolean {
		return this.lastWasTrajectoryPath;
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
			vis.addCircleRaw(this.getObstacleString(), new Vector(x, y), radius, vis.colors.redHalf, true);
		} else {
			// avoid string allocations in ra
			name = undefined;
		}
		this.circleObstacles.push({ x: x, y: y, radius: radius, name: name, prio: prio });
	}

	/** WARNING: only adds the obstacle to the trajectory path finding */
	addMovingCircle(startTime: number, endTime: number, startPos: Position, speed: Speed, acc: Vector, radius: number, priority: number) {
		startPos = Coordinates.toGlobal(startPos);
		speed = Coordinates.toGlobal(speed);
		acc = Coordinates.toGlobal(acc);

		if (endTime < 0 || endTime < startTime) {
			return;
		}

		if (!isPerformanceMode) {
			let positions = [];
			const SAMPLES = (acc.x === 0 && acc.y === 0) ? 2 : 10;
			const timeStep = (endTime - startTime) / (SAMPLES - 1);
			for (let i = 0; i < SAMPLES; i++) {
				let time = i * timeStep;
				let pos = startPos + speed * time + acc * (0.5 * time * time);
				positions.push(pos);
			}
			vis.addCircleRaw(this.getObstacleString(), startPos, radius, vis.colors.orangeHalf, true);
			vis.addCircleRaw(this.getObstacleString(), positions[SAMPLES - 1], radius, vis.colors.orangeHalf, true);
			vis.addPathRaw(this.getObstacleString(), positions, vis.colors.orangeHalf);
		}

		this._trajectoryInst.addMovingCircle(startTime, endTime, startPos.x, startPos.y,
			speed.x, speed.y, acc.x, acc.y, radius, priority);
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
			vis.addPathRaw(this.getObstacleString(), [new Vector(start_x, start_y), new Vector(stop_x, stop_y)],
					vis.colors.redHalf, undefined, undefined, 2 * radius);
		} else {
			// avoid string allocations in ra
			name = undefined;
		}
		this.lineObstacles.push({ start_x: start_x, start_y: start_y, stop_x: stop_x, stop_y: stop_y,
			radius: radius, name: name, prio: prio });
	}

	/** WARNING: only adds the obstacle to the trajectory path finding */
	addMovingLine(startTime: number, endTime: number, startPos1: Position, speed1: Speed, acc1: Vector,
			startPos2: Position, speed2: Speed, acc2: Vector, width: number, priority: number) {
		startPos1 = Coordinates.toGlobal(startPos1);
		speed1 = Coordinates.toGlobal(speed1);
		acc1 = Coordinates.toGlobal(acc1);
		startPos2 = Coordinates.toGlobal(startPos2);
		speed2 = Coordinates.toGlobal(speed2);
		acc2 = Coordinates.toGlobal(acc2);

		if (endTime < 0 || endTime < startTime) {
			return;
		}

		if (!isPerformanceMode) {
			if (USE_NEW_MOVING_LINE_VIS) {
				if (acc1.equals(new Vector(0, 0))
						&& acc2.equals(new Vector(0, 0))
						&& speed1.equals(new Vector(0, 0))
						&& speed2.equals(new Vector(0, 0))) {
					// both ends are stationary
					vis.addPathRaw(this.getObstacleString(), [startPos1, startPos2], vis.colors.orange.setAlpha(127), undefined, undefined, width);
				} else {
					const SAMPLES = 5;
					let timeStep = (endTime - startTime) / (SAMPLES - 1);
					for (let i = 0; i < SAMPLES; i++) {
						let time = i * timeStep;
						let pos1 = startPos1 + speed1 * time + acc1 * (0.5 * time * time);
						let pos2 = startPos2 + speed2 * time + acc2 * (0.5 * time * time);
						let alpha = 0.5 * 0.5 ** (startTime + time);
						vis.addPathRaw(this.getObstacleString(), [pos1, pos2], vis.colors.orange.setAlpha(255 * alpha), undefined, undefined, width);
					}
				}
			} else {
				let positions1 = [], positions2 = [];
				const SAMPLES = (acc1.x === 0 && acc1.y === 0 && acc2.x === 0 && acc2.y === 0) ? 2 : 10;
				const timeStep = (endTime - startTime) / (SAMPLES - 1);
				for (let i = 0; i < SAMPLES; i++) {
					let time = i * timeStep;
					let pos1 = startPos1 + speed1 * time + acc1 * (0.5 * time * time);
					let pos2 = startPos2 + speed2 * time + acc2 * (0.5 * time * time);
					positions1.push(pos1);
					positions2.push(pos2);
				}
				vis.addPathRaw(this.getObstacleString(), [startPos1, positions1[SAMPLES - 1]], vis.colors.orangeHalf, undefined, undefined, width);
				vis.addPathRaw(this.getObstacleString(), [startPos2, positions2[SAMPLES - 1]], vis.colors.orangeHalf, undefined, undefined, width);
				vis.addPathRaw(this.getObstacleString(), positions1, vis.colors.orangeHalf);
				vis.addPathRaw(this.getObstacleString(), positions2, vis.colors.orangeHalf);
			}
		}

		this._trajectoryInst.addMovingLine(startTime, endTime, startPos1.x, startPos1.y,
			speed1.x, speed1.y, acc1.x, acc1.y, startPos2.x, startPos2.y, speed2.x, speed2.y,
			acc2.x, acc2.y, width, priority);
	}

	addRect(start_x: number, start_y: number, stop_x: number, stop_y: number, radius: number, name?: string, prio: number = 0) {
		if (teamIsBlue) {
			start_x = -start_x;
			start_y = -start_y;
			stop_x = -stop_x;
			stop_y = -stop_y;
		}
		if (!isPerformanceMode) {
			vis.addPolygonRaw(this.getObstacleString(),
					[new Vector(start_x, start_y), new Vector(start_x, stop_y), new Vector(stop_x, stop_y),
						new Vector(stop_x, start_y)], vis.colors.redHalf, true);
		} else {
			// avoid string allocations in ra
			name = undefined;
		}
		this.rectObstacles.push({ start_x: start_x, start_y: start_y, stop_x: stop_x, stop_y: stop_y,
			radius: radius, name: name, prio: prio });
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
			vis.addPolygonRaw(this.getObstacleString(), [p1, p2, p3], vis.colors.redHalf, true);
		} else {
			// avoid string allocations in ra
			name = undefined;
		}
		this.triangleObstacles.push({ x1: x1, y1: y1, x2: x2, y2: y2, x3: x3, y3: y3,
			lineWidth: lineWidth, name: name, prio: prio });
	}

	addFriendlyRobotObstacle(robot: FriendlyRobot, radius: number, prio: number) {
		this._trajectoryInst.addRobotTrajectoryObstacle(robot.path._trajectoryInst.getTrajectoryAsObstacle(), prio, radius);
		if (!isPerformanceMode) {
			vis.addCircle(this.getObstacleString(), robot.pos, 2 * robot.radius, vis.colors.goldHalf, false, undefined, undefined, robot.radius);
		}
	}

	hasOpponentRobotObstacle(): boolean {
		return this._trajectoryInst.addOpponentRobotObstacle !== undefined;
	}

	addOpponentRobotObstacle(robot: Robot, prio: number) {
		if (!this._trajectoryInst.addOpponentRobotObstacle) {
			throw new Error("Can not add opponent robot obstacle, update Ra to fix!");
		}
		const start = Coordinates.toGlobal(robot.pos);
		const speed = Coordinates.toGlobal(robot.speed);
		this._trajectoryInst.addOpponentRobotObstacle(start.x, start.y, speed.x, speed.y, prio);
		if (!isPerformanceMode) {
			vis.addCircle(this.getObstacleString(), robot.pos, 1.5 * robot.radius, vis.colors.orchidHalf, false, undefined, undefined, robot.radius * 0.5);
			vis.addPath(this.getObstacleString(), [robot.pos, robot.pos + robot.speed], vis.colors.orchidHalf);
		}
	}

	addSeedTarget(x: number, y: number) {
		if (teamIsBlue) {
			x = -x;
			y = -y;
		}
		this._inst.addSeedTarget(x, y);
	}

	setOutOfFieldObstaclePriority(prio: number) {
		this._trajectoryInst.setOutOfFieldPrio(prio);
	}

	maxIntersectingObstaclePrio(): number {
		return this._trajectoryInst.maxIntersectingObstaclePrio();
	}
}

