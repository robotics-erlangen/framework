local SuggestPass = require "task/ability/suggestpass"
local MoveToPos = Class("Task.MoveToPos", require "task/base", SuggestPass)

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"


-- customObstacles is a table of obstacle tables
-- An obstacle table contains a string field called type and parameters relevant for Path:addX
-- Type can be "circle", "line", "rect" and "triangle"
function MoveToPos:_init(pos, dir, suggestPass, endSpeedLength, ignoreDefaultObstacles, customObstacles, ignoreBallPlacement)
	self._pos = pos
	self._dir = dir or (World.Ball.pos - pos):angle()
	self._suggestPassFlag = suggestPass
	self._endSpeedLength = endSpeedLength or 0
	local ignore = ignoreDefaultObstacles or false
	self._obstacleTable = {
		ignoreBall = ignore,
		ignoreGoals = ignore,
		ignoreDefenseArea = ignore,
		ignoreOpponentDefenseArea = ignore,
		inbox = self._inbox,
		ignorePass = (not self._inbox) or ignore,
        ignoreBallPlacementObstacle = ignoreBallPlacement
	}
	self._customObstacles = customObstacles or {}
end

function MoveToPos:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	for _, obstacle in ipairs(self._customObstacles) do
		self:_addCustomObstacle(obstacle)
	end

	local endSpeed = (self._pos - self._robot.pos):setLength(self._endSpeedLength)
	local _, time = self._robot.trajectory:update(ToTarget, self._pos, self._dir, nil, endSpeed)

	if self._suggestPassFlag then
		self:_suggestPassRobotPosition(self._pos, nil, time)
	end
end

function MoveToPos:_addCustomObstacle(obstInfo)
	local path = self._robot.path
	-- If this gets changed, the comment before _init also needs to be updated
	if obstInfo.type == "circle" then
		path:addCircle(obstInfo.x, obstInfo.y, obstInfo.radius, obstInfo.name)
	elseif obstInfo.type == "line" then
		path:addLine(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.radius, obstInfo.name)
	elseif obstInfo.type == "rect" then
		path:addRect(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.name)
	elseif obstInfo.type == "triangle" then
		path:addTriangle(obstInfo.x1, obstInfo.y1, obstInfo.x2, obstInfo.y2, obstInfo.x3, obstInfo.y3, obstInfo.lineWidth. obstInfo.name)
	end
end

return MoveToPos
