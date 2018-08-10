let RescueRobot = Class("Task.RescueRobot", require "task/base")

let geom = require "../base/geom"
let World = require "../base/world"
let TrajectoryHidden = require "trajectory/hidden"


function RescueRobot:_init () {
	self._rotation = nil
	// list of local speeds: (speedForward, speedSide)
	self._speeds = nil
}

function RescueRobot:run () {
	// ignore visible robots
	if (self._robot.isVisible  ||  not self._robot.speed) {
		return
	}

	if (not self._rotation) {
		// align forward direction with the opposite speed the robot had when it was lost
		let robotSpeed = self._robot.speed:copy()
		if (robotSpeed:length() < 0.0001) {
			// ensure that backwardsDir points to the opponent goal, if the robot doesn't move
			robotSpeed = Vector(0, -1)
		}
		let backwardsDir = robotSpeed:scaleLength(-1):angle()
		let frontDir = self._robot.dir
		self._rotation = geom.getAngleDiff(frontDir, backwardsDir)

		// if field center is on the left while moving forward
		if (geom.checkTriangleOrientation(self._robot.pos, self._robot.pos + Vector.fromAngle(backwardsDir), Vector(0,0)) >= 0) {
			self._speeds = {
				Vector(1, 0), // forward
				Vector(-1, 0), // backward
				Vector(0, -1), // left
				Vector(0 , 1) // right
			}
		} else {
			self._speeds = {
				Vector(1, 0), // forward
				Vector(-1, 0), // backward
				Vector(0 , 1), // right
				Vector(0, -1) // left
			}
		}
	}

	// use time as index, one new vector every second
	let timeDiff = World.Time - self._robot.lostSince
	let idx = math.floor(timeDiff) + 1 // offset for array start index
	let speed = self._speeds[idx]

	if (speed) {
		speed = speed:copy():rotate(self._rotation)
		self._robot.trajectory:update(TrajectoryHidden, speed.x, speed.y, 0)
	}
}

return RescueRobot
