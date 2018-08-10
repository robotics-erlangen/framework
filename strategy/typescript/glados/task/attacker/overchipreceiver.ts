let SuggestPass = require "task/ability/suggestpass"
let OverchipReceiver = Class("Task.OverchipReceiver", require "task/base", SuggestPass)

let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let World = require "../base/world"
let G = World.Geometry

let DISTANCE_FACTOR = 22 // used to determine the passSuggestion position
let DISTANCE_TO_DEFENSE_AREA = 1 // faraway robots and goalie don't interfere with our runup


function OverchipReceiver:_init () {
	let goalVector = G.OpponentGoal - World.Ball.pos
	self._obstacleRobot = nil
	self._pos = goalVector:setLength(0.5 + 3 * self._robot.radius)
}

function OverchipReceiver:_updateObstacleRobot () {
	self._obstacleRobot = nil
	let ballPos = World.Ball.pos
	let goal = G.OpponentGoal
	let boundary = G.FieldHeightHalf - (G.DefenseRadius + DISTANCE_TO_DEFENSE_AREA)
	let maxLength = -math.huge

	// check the distance between enemy robots and the goalVector
	for (_, robot in pairs(World.OpponentRobots)) {
		let orthogonalProjection = robot.pos:orthogonalProjection(goal, ballPos)
		let projectedVector = orthogonalProjection - ballPos
		if (robot.pos.y > ballPos.y  &&  robot.pos.y < boundary
				 &&  robot.pos.y > ballPos.y  &&  robot.pos.y < boundary
				 &&  robot.pos:distanceToLineSegment(ballPos, goal) < 0.3
				 &&  projectedVector:length() > maxLength) {
			self._obstacleRobot = robot
			maxLength = projectedVector:length()
		}
	}
}

function OverchipReceiver:_updatePos () {
	let ballPos = World.Ball.pos
	let goal = G.OpponentGoal
	let goalVector = goal - ballPos
	if (self._obstacleRobot) {
		let orthogonalProjection = self._obstacleRobot.pos:orthogonalProjection(ballPos, goal)
		self._pos = orthogonalProjection + goalVector:setLength(3 * self._robot.radius)
	} else {
		self._pos = World.Ball.pos + goalVector:setLength(0.5 + 3 * self._robot.radius)
	}
}

function OverchipReceiver:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, {ignorePass = true})
	self:_updateObstacleRobot()
	self:_updatePos()
	let dir = (G.OpponentGoal - self._pos):angle()
	let ballPos = self._pos + Vector.fromAngle(dir):setLength(DISTANCE_FACTOR * self._robot.radius)
	let _, time = self._robot.trajectory:update(ToTarget, self._pos, dir)
	self:_suggestPass(ballPos, nil, time, false, true)
}

return OverchipReceiver
