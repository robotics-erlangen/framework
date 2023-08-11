import * as Constants from "base/constants";
import { Coordinates } from "base/coordinates";
import { Path, Waypoint, Obstacle } from "base/path";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

// Declare start, end and obstacles here
let pointStart = Coordinates.toGlobal(new Vector(0, -0.35));
let pointEnd = Coordinates.toGlobal(new Vector(0, 1));

let obstacles: Obstacle[] = [
	{
		type: "line",
		start: new Vector(-0.5, 0.1),
		end: new Vector(1, 0.1),
		radius: 0.02,
	},
	{
		type: "line",
		start: new Vector(-0.5, -0.5),
		end: new Vector(0.5, -0.5),
		radius: 0.02,
	},
	{
		type: "triangle",
		p1: new Vector(0.4, 0),
		p2: new Vector(-1, 0.3),
		p3: new Vector(-1, -0.3),
		lineWidth: 0.3,
	},
];

let pathInstance: Path | undefined = undefined;

function setupPath() {
	if (pathInstance !== undefined) {
		return pathInstance;
	}

	const geometry = World.Geometry;
	pathInstance = new Path(0);
	if (pathInstance.robotId() !== 0) {
		throw new Error();
	}

	pathInstance.setBoundary(
		-geometry.FieldWidthHalf - geometry.BoundaryWidth - 0.02,
		-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
		geometry.FieldWidthHalf + geometry.BoundaryWidth + 0.02,
		geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02,
	);

	for (const obstacle of obstacles) {
		pathInstance.addObstacle(obstacle);
	}
	pathInstance.setRadius(Constants.maxRobotRadius);

	return pathInstance;
}

function drawObstacles() {
	for (const obstacle of obstacles) {
		switch (obstacle.type) {
			case "circle":
				vis.addCircle("obstacles", obstacle.center, obstacle.radius, vis.colors.blue);
				break;
			case "line":
				vis.addPath("obstacles", [obstacle.start, obstacle.end], vis.colors.blue);
				break;
			case "triangle":
				vis.addPath("obstacles", [obstacle.p1, obstacle.p2], vis.colors.blue);
				vis.addPath("obstacles", [obstacle.p2, obstacle.p3], vis.colors.blue);
				vis.addPath("obstacles", [obstacle.p3, obstacle.p1], vis.colors.blue);
				break;
		}
	}

	vis.addCircle("obstacles", pointStart, 0.03, vis.colors.green);
	vis.addCircle("obstacles", pointEnd, 0.03, vis.colors.green);
}


function drawWaypoints(waypoints: Waypoint[]) {
	let prev = pointStart;
	let dist = 0;
	for (const waypoint of waypoints) {
		let curr = new Vector(waypoint[0], waypoint[1]);
		vis.addPathRaw("waypoints", [prev, curr], vis.colors.yellow);
		dist += curr.distanceTo(prev);
		prev = curr;
	}
	return dist;
}

export function testFixedObstacles() {
	const path = setupPath();
	drawObstacles();
	const waypoints = path.getPath(pointStart.x, pointStart.y, pointEnd.x, pointEnd.y);
	drawWaypoints(waypoints);
	// path.addTreeVisualization();
}

export function testStartEqualsEnd() {
	const path = setupPath();
	drawObstacles();
	const waypoints = path.getPath(pointStart.x, pointStart.y, pointStart.x, pointStart.y);
	drawWaypoints(waypoints);
	// path.addTreeVisualization();
}

export function testStartEndObstacles() {
	const path = setupPath();
	pointStart = Coordinates.toGlobal(new Vector(0.02, 0));
	pointEnd = pointStart;
	setupPath();
	drawObstacles();
	const waypoints = path.getPath(pointStart.x, pointStart.y, pointStart.x, pointStart.y);
	drawWaypoints(waypoints);
	// path.addTreeVisualization();
}
