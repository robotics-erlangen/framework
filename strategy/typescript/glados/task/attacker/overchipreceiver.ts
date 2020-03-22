let SuggestPass} from "glados/task/ability/suggestpass"
let OverchipReceiver = Class("Task.OverchipReceiver", require "task/base", SuggestPass)

import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
import * as World from "base/world";
let G = World.Geometry

let DISTANCE_FACTOR = 22 // used to determine the passSuggestion position
let DISTANCE_TO_DEFENSE_AREA = 1 // faraway robots and goalie don't interfere with our runup


function OverchipReceiver:_init () {
	let goalVector = G.OpponentGoal - World.Ball.pos
	this._obstacleRobot = nil
	this._pos = goalVector.setLength(0.5 + 3 * this._robot.radius)
}

function OverchipReceiver:_updateObstacleRobot () {
	this._obstacleRobot = nil
	let ballPos = World.Ball.pos
	let goal = G.OpponentGoal
	let boundary = G.FieldHeightHalf - (G.DefenseHeight + DISTANCE_TO_DEFENSE_AREA)
	let maxLength = -Infinity

	// check the distance between enemy robots and the goalVector
	for (_, robot in pairs(World.OpponentRobots)) {
		let orthogonalProjection = robot.pos.orthogonalProjection(goal, ballPos)
		let projectedVector = orthogonalProjection - ballPos
		if (robot.pos.y > ballPos.y && robot.pos.y < boundary
				 &&  robot.pos.y > ballPos.y && robot.pos.y < boundary
				 &&  robot.pos.distanceToLineSegment(ballPos, goal) < 0.3
				 &&  projectedVector.length() > maxLength) {
			this._obstacleRobot = robot
			maxLength = projectedVector.length()
		}
	}
}

function OverchipReceiver:_updatePos () {
	let ballPos = World.Ball.pos
	let goal = G.OpponentGoal
	let goalVector = goal - ballPos
	if (this._obstacleRobot) {
		let orthogonalProjection = this._obstacleRobot.pos.orthogonalProjection(ballPos, goal)
		this._pos = orthogonalProjection + goalVector.setLength(3 * this._robot.radius)
	} else {
		this._pos = World.Ball.pos + goalVector.setLength(0.5 + 3 * this._robot.radius)
	}
}

function OverchipReceiver:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, {ignorePass = true})
	this._updateObstacleRobot()
	this._updatePos()
	let dir = (G.OpponentGoal - this._pos).angle()
	let ballPos = this._pos + Vector.fromAngle(dir).setLength(DISTANCE_FACTOR * this._robot.radius)
	let _, time = this._robot.trajectory.update(ToTarget, this._pos, dir)
	this._suggestPass(ballPos, undefined, time, false, true)
}

return OverchipReceiver
