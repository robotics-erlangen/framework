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


interface ObstacleCommon {
	name?: string;
	prio?: number;
}

export interface CircleObstacle extends ObstacleCommon {
	type: "circle";
	center: Position;
	radius: number;
}

export interface LineObstacle extends ObstacleCommon {
	type: "line";
	start: Position;
	end: Position;
	radius: number;
}

export interface RectObstacle extends ObstacleCommon {
	type: "rect";
	start: Position;
	end: Position;
	radius: number;
}

export interface TriangleObstacle extends ObstacleCommon {
	type: "triangle";
	p1: Position;
	p2: Position;
	p3: Position;
	lineWidth: number;
}

export type Obstacle = CircleObstacle | LineObstacle | RectObstacle | TriangleObstacle;

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

	// these contain the obstacles in global coordinates
	private _circleObstacles: CircleObstacle[] = [];
	private _lineObstacles: LineObstacle[] = [];
	private _rectObstacles: RectObstacle[] = [];
	private _triangleObstacles: TriangleObstacle[] = [];

	private _lastWasTrajectoryPath: boolean = false;

	public constructor(robotId: number) {
		this._inst = pathLocal.createPath();
		this._trajectoryInst = pathLocal.createTrajectoryPath();
		if (this._trajectoryInst.setRobotId) {
			this._trajectoryInst.setRobotId(robotId);
		}
		this._robotId = robotId;
	}

	public robotId() {
		return this._robotId;
	}

	public seedRandom(seed: number) {
		this._inst.seedRandom(seed);
		this._trajectoryInst.seedRandom(seed);
	}

	private _addObstaclesToPath(path: PathObjectCommon) {
		for (let circle of this._circleObstacles) {
			path.addCircle(circle.center.x, circle.center.y, circle.radius, circle.name, circle.prio ?? 0);
		}
		for (let line of this._lineObstacles) {
			path.addLine(line.start.x, line.start.y, line.end.x, line.end.y, line.radius, line.name, line.prio ?? 0);
		}
		for (let rect of this._rectObstacles) {
			path.addRect(rect.start.x, rect.start.y, rect.end.x, rect.end.y, rect.name, rect.prio ?? 0, rect.radius);
		}
		for (let tri of this._triangleObstacles) {
			path.addTriangle(tri.p1.x, tri.p1.y, tri.p2.x, tri.p2.y, tri.p3.x, tri.p3.y, tri.lineWidth, tri.name, tri.prio ?? 0);
		}
	}

	private _getObstacleString() {
		let teamLetter = "y";
		if (teamIsBlue) {
			teamLetter = "b";
		}
		return `obstacles: ${this._robotId}${teamLetter}`;
	}

	public setHalted() {
		this._lastWasTrajectoryPath = false;
	}

	public getTrajectory(startPos: Position, startSpeed: Speed, endPos: Position, endSpeed: Speed, maxSpeed: number, acceleration: number): { pos: Position; speed: Speed; time: number }[] {
		this._lastWasTrajectoryPath = true;
		this._addObstaclesToPath(this._trajectoryInst);
		let t = this._trajectoryInst.calculateTrajectory(startPos.x, startPos.y, startSpeed.x,
			startSpeed.y, endPos.x, endPos.y, endSpeed.x, endSpeed.y, maxSpeed, acceleration);
		let result: { pos: Position; speed: Speed; time: number }[] = [];
		for (let p of t) {
			result.push({ pos: new Vector(p.px, p.py), speed: new Vector(p.vx, p.vy), time: p.time });
		}
		return result;
	}

	public getPath(x1: number, y1: number, x2: number, y2: number): Waypoint[] {
		this._lastWasTrajectoryPath = false;
		this._addObstaclesToPath(this._inst);
		return this._inst.getPath(x1, y1, x2, y2);
	}

	public lastFrameWasTrajectoryPath(): boolean {
		return this._lastWasTrajectoryPath;
	}

	public setProbabilities(a: number, b: number) {
		this._inst.setProbabilities(a, b);
	}

	public setBoundary(x1: number, y1: number, x2: number, y2: number) {
		this._inst.setBoundary(x1, y1, x2, y2);
		this._trajectoryInst.setBoundary(x1, y1, x2, y2);
	}

	public clearObstacles() {
		this._inst.clearObstacles();
		this._trajectoryInst.clearObstacles();
		this._circleObstacles.length = 0;
		this._lineObstacles.length = 0;
		this._rectObstacles.length = 0;
		this._triangleObstacles.length = 0;
	}

	public setRadius(radius: number) {
		this._inst.setRadius(radius);
		this._trajectoryInst.setRadius(radius);
	}

	public addObstacle(obstacle: Obstacle) {
		if (isPerformanceMode) {
			// avoid string allocations in ra
			obstacle.name = undefined;
		}

		switch (obstacle.type) {
			case "circle": {
				if (!isPerformanceMode) {
					vis.addCircle(this._getObstacleString(), obstacle.center, obstacle.radius, vis.colors.redHalf, true);
				}

				// strategy to global coordinates conversion
				obstacle.center = Coordinates.toGlobal(obstacle.center);
				this._circleObstacles.push(obstacle);
				break;
			}
			case "line": {
				if (!isPerformanceMode) {
					vis.addPath(this._getObstacleString(), [obstacle.start, obstacle.end], vis.colors.redHalf, true, undefined, 2 * obstacle.radius);
				}

				// strategy to global coordinates conversion
				obstacle.start = Coordinates.toGlobal(obstacle.start);
				obstacle.end = Coordinates.toGlobal(obstacle.end);
				this._lineObstacles.push(obstacle);
				break;
			}
			case "rect": {
				if (!isPerformanceMode) {
					vis.addPolygon(
						this._getObstacleString(),
						[obstacle.start, obstacle.start.withY(obstacle.end.y), obstacle.end, obstacle.end.withY(obstacle.start.y)],
						vis.colors.redHalf, true
					);
				}

				// strategy to global coordinates conversion
				obstacle.start = Coordinates.toGlobal(obstacle.start);
				obstacle.end = Coordinates.toGlobal(obstacle.end);
				this._rectObstacles.push(obstacle);
				break;
			}
			case "triangle": {
				if (!isPerformanceMode) {
					vis.addPolygon(
						this._getObstacleString(),
						[obstacle.p1, obstacle.p2, obstacle.p3],
						vis.colors.redHalf, true
					);
				}

				// strategy to global coordinates conversion
				obstacle.p1 = Coordinates.toGlobal(obstacle.p1);
				obstacle.p2 = Coordinates.toGlobal(obstacle.p2);
				obstacle.p3 = Coordinates.toGlobal(obstacle.p3);
				this._triangleObstacles.push(obstacle);
				break;
			}
		}
	}

	public addCircle(center: Position, radius: number, name?: string, prio: number = 0) {
		this.addObstacle({ type: "circle", center, radius, name, prio });
	}

	/** WARNING: only adds the obstacle to the trajectory path finding */
	public addMovingCircle(startTime: number, endTime: number, startPos: Position, speed: Speed, acc: Vector, radius: number, priority: number) {
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
			vis.addCircleRaw(this._getObstacleString(), startPos, radius, vis.colors.orangeHalf, true);
			vis.addCircleRaw(this._getObstacleString(), positions[SAMPLES - 1], radius, vis.colors.orangeHalf, true);
			vis.addPathRaw(this._getObstacleString(), positions, vis.colors.orangeHalf);
		}

		this._trajectoryInst.addMovingCircle(startTime, endTime, startPos.x, startPos.y,
			speed.x, speed.y, acc.x, acc.y, radius, priority);
	}

	public addLine(start: Position, end: Position, radius: number, name?: string, prio: number = 0) {
		this.addObstacle({ type: "line", start, end, radius, name, prio });
	}

	/** WARNING: only adds the obstacle to the trajectory path finding */
	public addMovingLine(startTime: number, endTime: number, startPos1: Position, speed1: Speed, acc1: Vector,
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
					vis.addPathRaw(this._getObstacleString(), [startPos1, startPos2], vis.colors.orange.setAlpha(127), undefined, undefined, width);
				} else {
					const SAMPLES = 5;
					let timeStep = (endTime - startTime) / (SAMPLES - 1);
					for (let i = 0; i < SAMPLES; i++) {
						let time = i * timeStep;
						let pos1 = startPos1 + speed1 * time + acc1 * (0.5 * time * time);
						let pos2 = startPos2 + speed2 * time + acc2 * (0.5 * time * time);
						let alpha = 0.5 * 0.5 ** (startTime + time);
						vis.addPathRaw(this._getObstacleString(), [pos1, pos2], vis.colors.orange.setAlpha(255 * alpha), undefined, undefined, width);
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
				vis.addPathRaw(this._getObstacleString(), [startPos1, positions1[SAMPLES - 1]], vis.colors.orangeHalf, undefined, undefined, width);
				vis.addPathRaw(this._getObstacleString(), [startPos2, positions2[SAMPLES - 1]], vis.colors.orangeHalf, undefined, undefined, width);
				vis.addPathRaw(this._getObstacleString(), positions1, vis.colors.orangeHalf);
				vis.addPathRaw(this._getObstacleString(), positions2, vis.colors.orangeHalf);
			}
		}

		this._trajectoryInst.addMovingLine(startTime, endTime, startPos1.x, startPos1.y,
			speed1.x, speed1.y, acc1.x, acc1.y, startPos2.x, startPos2.y, speed2.x, speed2.y,
			acc2.x, acc2.y, width, priority);
	}

	public addRect(start: Position, end: Position, radius: number, name?: string, prio: number = 0) {
		this.addObstacle({ type: "rect", start, end, radius, name, prio });
	}

	public addTriangle(p1: Position, p2: Position, p3: Position, lineWidth: number, name?: string, prio: number = 0) {
		this.addObstacle({ type: "triangle", p1, p2, p3, lineWidth, name, prio });
	}

	public addFriendlyRobotObstacle(robot: FriendlyRobot, radius: number, prio: number) {
		this._trajectoryInst.addRobotTrajectoryObstacle(robot.path._trajectoryInst.getTrajectoryAsObstacle(), prio, radius);
		if (!isPerformanceMode) {
			vis.addCircle(this._getObstacleString(), robot.pos, 2 * robot.radius, vis.colors.goldHalf, false, undefined, undefined, robot.radius);
		}
	}

	public hasOpponentRobotObstacle(): boolean {
		return this._trajectoryInst.addOpponentRobotObstacle !== undefined;
	}

	public addOpponentRobotObstacle(robot: Robot, prio: number) {
		if (!this._trajectoryInst.addOpponentRobotObstacle) {
			throw new Error("Can not add opponent robot obstacle, update Ra to fix!");
		}
		const start = Coordinates.toGlobal(robot.pos);
		const speed = Coordinates.toGlobal(robot.speed);
		this._trajectoryInst.addOpponentRobotObstacle(start.x, start.y, speed.x, speed.y, prio);
		if (!isPerformanceMode) {
			vis.addCircle(this._getObstacleString(), robot.pos, 1.5 * robot.radius, vis.colors.orchidHalf, false, undefined, undefined, robot.radius * 0.5);
			vis.addPath(this._getObstacleString(), [robot.pos, robot.pos + robot.speed], vis.colors.orchidHalf);
		}
	}

	public addSeedTarget(x: number, y: number) {
		if (teamIsBlue) {
			x = -x;
			y = -y;
		}
		this._inst.addSeedTarget(x, y);
	}

	public setOutOfFieldObstaclePriority(prio: number) {
		this._trajectoryInst.setOutOfFieldPrio(prio);
	}

	public maxIntersectingObstaclePrio(): number {
		return this._trajectoryInst.maxIntersectingObstaclePrio();
	}
}

