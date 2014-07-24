local RandomKeeper = (require "../base/class").newTask("Task.RandomKeeper", require "task/base")

local World = require "../base/world"
local Field = require "../base/field"
local ToTarget = require "trajectory/totarget"

local destSwitchDistance = 0.02
local goalDistance = Settings.keeperGoalDistance

function RandomKeeper:_init()
	self._nextX = nil
end

function RandomKeeper:run()
	if not self._nextX or math.abs(self._robot.pos.x - self._nextX) < destSwitchDistance then
		local bound = World.Geometry.GoalWidth/2 - self._robot.radius
		self._nextX = math.random() * bound * 2 - bound
	end

	local moveDest = Vector.create(self._nextX,
			-World.Geometry.FieldHeightHalf + self._robot.radius + goalDistance)

	-- add obstacles if outside keeper area
	if not Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius) then
		self._robot.path:addRobotObstacles(self._robot, false, false)
	end
	-- ignore goal walls if ball is shot
	self._robot.path:setDefaultObstacles(self._robot, true, false, true, self._robot.radius, 0.05)
	self._robot.trajectory:update(ToTarget, moveDest, math.pi/2)
end

return RandomKeeper
