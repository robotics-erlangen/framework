local KickoffMirror = Class("Task.KickoffMirror", require "task/base")

local debug = require "../base/debug"
local Defense = require "util/defense"
local Field = require "../base/field"
local World = require "../base/world"
local Game = require "observer/game"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local DISTANCE_HYSTERESIS = 0.03 -- for all minimum/maximum distance search loops

--task maximum 2 robots!
--@param distanceToCenterLine number - how far the robot stays away from the center line
function KickoffMirror:_init(distanceToCenterLine)
	self._distance = distanceToCenterLine
	self._lastTargetRobot = nil
	self._targetPos = nil
end

--- mirrors the opponent that is the closest one to our goal
function KickoffMirror:run()
	-- check position of other kickoffMirror
	local side = true
	for robot, _ in pairs(self._inbox.kickoffMirrorFlag()) do
		if self._robot.pos.x < robot.pos.x then
			side = false
		end
	end
	self._send.kickoffMirrorFlag("all")

	local sector1, _, sector3 = Game.divideOpponentsIntoSectors(false)
	local sector = side and sector3 or sector1

	local pos
	if #sector == 0 then -- no opponents found
		local targetPosX = (side and 1 or -1) * World.Geometry.FieldWidthQuarter
		pos = Vector(targetPosX, -self._robot.radius)
	else
		local minDist = math.huge
		local lastMinDist = self._lastTargetRobot and
				self._lastTargetRobot.pos:distanceTo(World.Geometry.FriendlyGoal) or
				math.huge
		local targetRobot = nil
		for _,r in ipairs(sector) do
			local dist = r.pos:distanceTo(World.Geometry.FriendlyGoal)
			if dist < minDist then
				minDist = dist
				targetRobot = r
			end
		end
		if minDist + DISTANCE_HYSTERESIS < lastMinDist or
				(side and 3 or 1) ~= Game.getSector(self._lastTargetRobot, true) then
			self._lastTargetRobot = targetRobot
		end
		pos  = Defense.manMarkPos(self._lastTargetRobot)
		if pos.y > -self._robot.radius then
			pos.y=-self._robot.radius
		end
	end

	self._targetPos = Field.limitToField(pos, -self._robot.radius)

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	self._robot.trajectory:update(ToTarget, self._targetPos, math.pi/2)
end

return KickoffMirror
