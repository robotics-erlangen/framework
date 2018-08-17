let RescueRobot = Class("Task.RescueRobot", require "task/base")

import * as geom from "base/geom";
import * as World from "base/world";
let TrajectoryHidden = require "trajectory/hidden"


function RescueRobot:_init () {
	this._rotation = nil
	// list of local speeds: (speedForward, speedSide)
	this._speeds = nil
}

function RescueRobot:run () {
	// ignore visible robots
	if (this._robot.isVisible || not this._robot.speed) {
		return
	}

	if (not this._rotation) {
		// align forward direction with the opposite speed the robot had when it was lost
		let robotSpeed = this._robot.speed.copy()
		if (robotSpeed.length() < 0.0001) {
			// ensure that backwardsDir points to the opponent goal, if the robot doesn't move
			robotSpeed = new Vector(0, -1)
		}
		let backwardsDir = robotSpeed.scaleLength(-1).angle()
		let frontDir = this._robot.dir
		this._rotation = geom.getAngleDiff(frontDir, backwardsDir)

		// if field center is on the left while moving forward
		if (geom.checkTriangleOrientation(this._robot.pos, this._robot.pos + Vector.fromAngle(backwardsDir), new Vector(0,0)) >= 0) {
			this._speeds = {
				Vector(1, 0), // forward
				Vector(-1, 0), // backward
				Vector(0, -1), // left
				Vector(0 , 1) // right
			}
		} else {
			this._speeds = {
				Vector(1, 0), // forward
				Vector(-1, 0), // backward
				Vector(0 , 1), // right
				Vector(0, -1) // left
			}
		}
	}

	// use time as index, one new vector every second
	let timeDiff = World.Time - this._robot.lostSince
	let idx = Math.floor(timeDiff) + 1 // offset for array start index
	let speed = this._speeds[idx]

	if (speed) {
		speed = speed.copy().rotate(this._rotation)
		this._robot.trajectory.update(TrajectoryHidden, speed.x, speed.y, 0)
	}
}

return RescueRobot
