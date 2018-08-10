let SuggestPass = require "task/ability/suggestpass"
let MoveToPos = Class("Task.MoveToPos", require "task/base", SuggestPass)

let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let World = require "../base/world"


// customObstacles is a table of obstacle tables
// An obstacle table contains a string field called type and parameters relevant for Path:addX
// Type can be "circle", "line", "rect" and "triangle"
function MoveToPos:_init (pos, dir, suggestPass, endSpeedLength, ignoreDefaultObstacles, customObstacles, ignoreBallPlacement, ignoreBall) {
	self._pos = pos
	self._dir = dir  ||  (World.Ball.pos - pos):angle()
	self._suggestPassFlag = suggestPass
	self._endSpeedLength = endSpeedLength  ||  0
	let ignore = ignoreDefaultObstacles  ||  false
	self._obstacleTable = {
		ignoreBall = ignore  ||  ignoreBall,
		ignoreGoals = ignore,
		ignoreDefenseArea = ignore,
		ignoreOpponentDefenseArea = ignore,
		inbox = self._inbox,
		ignorePass = (not self._inbox)  ||  ignore,
        ignoreBallPlacementObstacle = ignoreBallPlacement
	}
	self._customObstacles = customObstacles  ||  {}
}

function MoveToPos:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	for (_, obstacle in ipairs(self._customObstacles)) {
		self:_addCustomObstacle(obstacle)
	}

	let endSpeed = (self._pos - self._robot.pos):setLength(self._endSpeedLength)
	let _, time = self._robot.trajectory:update(ToTarget, self._pos, self._dir, nil, endSpeed)

	if (self._suggestPassFlag) {
		self:_suggestPassRobotPosition(self._pos, nil, time)
	}
}

function MoveToPos:_addCustomObstacle (obstInfo) {
	let path = self._robot.path
	// If this gets changed, the comment before _init also needs to be updated
	if (obstInfo.type == "circle") {
		path:addCircle(obstInfo.x, obstInfo.y, obstInfo.radius, obstInfo.name)
	} else if (obstInfo.type == "line") {
		path:addLine(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.radius, obstInfo.name)
	} else if (obstInfo.type == "rect") {
		path:addRect(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.name)
	} else if (obstInfo.type == "triangle") {
		path:addTriangle(obstInfo.x1, obstInfo.y1, obstInfo.x2, obstInfo.y2, obstInfo.x3, obstInfo.y3, obstInfo.lineWidth. obstInfo.name)
	}
}

return MoveToPos
