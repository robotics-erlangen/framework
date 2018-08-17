let moveToBall = Class("Task.moveToBall", require "task/base")

import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
import * as vis from "base/vis";


function moveToBall:_init (ballAddSpeed) {
	this._addspeed = ballAddSpeed || 0
	this._angleWeight = 1
	this._obstacleTable = {
		ignoreBall = true,
		ignorePass = true,
		ignoreDefenseArea = true,
		ignoreOpponentDefenseArea = false,
	}
}

function moveToBall:run () {
	let ball = World.Ball
	let offset = (this._robot.pos - ball.pos).setLength(this._robot.shootRadius + World.Ball.radius)
	offset.y = 0
	let pos = ball.pos - offset
	// this._robot.pos * 0.5 + ball.pos/2 - new Vector(0, this._robot.radius/3) + ball.speed/10
	vis.addCircle("toball", pos, ball.pos.distanceTo(pos), vis.colors.redHalf, true)
	let dir = ball.pos - pos
	let dir2 = World.Geometry.OpponentGoal - pos
	dir = dir / dir2.lengthSq() + dir2 / dir.lengthSq()
	dir = dir.angle()

	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable)
	this._robot.trajectory.update(ToTarget, pos, dir, undefined, ball.speed * 0.98 + new Vector(dir2.setLength(0.1).x, this._addspeed))

}

return moveToBall
