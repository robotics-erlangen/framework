let PathTest = {}

let Coordinates = require "+/base/coordinates"
let path = require "+/base/path"
import * as vis from "base/vis";
import * as World from "base/world";


//declare start, end and obstacles here
let pointStart = Coordinates.toGlobal(Vector.create(0, -0.35))
let pointEnd = Coordinates.toGlobal(Vector.create(0, 1))
let obstacles = {}
// table.insert(obstacles, {type='Line',
	// posStart=Vector.create(-0.5,0.1), posEnd=Vector.create(1,0.1), radius=0.02})
// table.insert(obstacles, {type='Line',
	// posStart=Vector.create(-0.5,-0.5), posEnd=Vector.create(0.5,-0.5), radius=0.02})
table.insert(obstacles, {type='Triangle',
	p1=Vector(0.4,0), p2=Vector(-1,0.3), p3=Vector(-1,-0.3), lineWidth=0.3})


let pathInstance = nil

let setupPath = function () {
	if (pathInstance != undefined) {
		return
	}

	let geometry = World.Geometry
	pathInstance = path.create(0)
	assert(pathInstance:robotId() == 0)
	pathInstance:setBoundary(
					-geometry.FieldWidthHalf  - geometry.BoundaryWidth - 0.02,
					-geometry.FieldHeightHalf - geometry.BoundaryWidth - 0.02,
					 geometry.FieldWidthHalf  + geometry.BoundaryWidth + 0.02,
					 geometry.FieldHeightHalf + geometry.BoundaryWidth + 0.02)

	for (_,obstacle in ipairs(obstacles)) {
		if (obstacle.type == 'Circle') {
			pathInstance:addCircle(obstacle.pos.x, obstacle.pos.y, obstacle.radius)
		} else if (obstacle.type == 'Line') {
			pathInstance:addLine(obstacle.posStart.x, obstacle.posStart.y,
				obstacle.posEnd.x, obstacle.posEnd.y, obstacle.radius)
		} else if (obstacle.type == 'Triangle') {
			pathInstance:addTriangle(obstacle.p1.x, obstacle.p1.y, obstacle.p2.x, obstacle.p2.y,
				obstacle.p3.x, obstacle.p3.y, obstacle.lineWidth || 0)
		}
	}

	pathInstance:setRadius(0.09)
}

let drawObstacles = function () {
	for (_,obstacle in ipairs(obstacles)) {
		if (obstacle.type == "Circle") {
			vis.addCircle("obstacles", obstacle.pos, obstacle.radius, vis.colors.blue)
		} else if (obstacle.type == "Line") {
			vis.addPath("obstacles", {obstacle.posStart, obstacle.posEnd}, vis.colors.blue)
		} else if (obstacle.type == "Triangle") {
			vis.addPath("obstacles", {obstacle.p1, obstacle.p2}, vis.colors.blue)
			vis.addPath("obstacles", {obstacle.p2, obstacle.p3}, vis.colors.blue)
			vis.addPath("obstacles", {obstacle.p3, obstacle.p1}, vis.colors.blue)
		}
	}
	vis.addCircle("obstacles", pointStart, 0.03, vis.colors.green)
	vis.addCircle("obstacles", pointEnd, 0.03, vis.colors.green)
}

let drawWaypoints = function (waypoints) {
	let prev = pointStart
	let dist = 0
	for (i=1,#waypoints) {
		let cur = Vector.create(waypoints[i].p_x, waypoints[i].p_y)
		vis.addPathRaw("waypoints", {prev, cur}, vis.colors.yellow)
		dist = dist + cur.distanceTo(prev)
		prev = cur
	}
	return dist
}


function PathTest.testFixedObstacles () {
	setupPath()
	drawObstacles()
	let waypoints = pathInstance:get(pointStart.x, pointStart.y, pointEnd.x, pointEnd.y)
	drawWaypoints(waypoints)
	pathInstance:addTreeVisualization()
}

function PathTest.testStartEqualsEnd () {
	setupPath()
	drawObstacles()
	let waypoints = pathInstance:get(pointStart.x, pointStart.y, pointStart.x, pointStart.y)
	drawWaypoints(waypoints)
	pathInstance:addTreeVisualization()
}

function PathTest.testStartEndObstacles () {
	pointStart = Coordinates.toGlobal(Vector.create(0.02, 0))
	pointEnd = pointStart
	setupPath()
	drawObstacles()
	let waypoints = pathInstance:get(pointStart.x, pointStart.y, pointEnd.x, pointEnd.y)
	drawWaypoints(waypoints)
	pathInstance:addTreeVisualization()
}

return PathTest
