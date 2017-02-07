local StopAttack = Class("Task.StopAttack", require "task/base")

local Constants = require "../base/constants"
local Field = require "../base/field"
local geom = require "../base/geom"
local Math = require "../base/math"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local UtilDefense = require "util/defense"
local RobotList = require "util/robotlist"

local POSITION_PADDING = 0.03 -- safety distance

function StopAttack:_init()
	self._focusPoint = Vector(0, -World.Geometry.FieldHeightHalf + 4 * self._robot.radius)
	self._side = World.Ball.pos.x < 0 and "left" or "right"
	self._defenseHysteresis = false
end

-- normalize angle created by direction to be always relative to segment ball to field border
local function getNormalizedAngle(direction)
	local angle = direction:angle()
	if World.Ball.pos.x > 0 then
		angle = geom.normalizeAnglePositive(angle)
	end
	return angle
end

function StopAttack:run()
	local stopRadius = Constants.stopBallDistance + self._robot.radius + POSITION_PADDING
	local pos = World.Ball.pos + (self._focusPoint - World.Ball.pos):setLength(stopRadius)
	local driveAngle = (World.Ball.pos - pos):angle()

	local opponentShooter, dist = UtilDefense.getClosestRobot(World.OpponentRobots, World.Ball.pos)

	-- hysteresis on distance between opponent shooter and ball
	if self._defenseHysteresis then
		dist = dist - 0.5
	end

	-- try to always be where the opponent shooter will try to shoot
	if dist < 0.2 + self._robot.radius and World.RefereeState == "IndirectDefensive" then
		local passReceivers = RobotList.excludeRobots(World.OpponentRobots, {opponentShooter, World.OpponentKeeper})
		local minAngle = math.huge
		local maxAngle = -math.huge
		for _, robot in ipairs(passReceivers) do
			local angle = getNormalizedAngle(Field.limitToAllowedField(robot.pos, robot.radius) - World.Ball.pos)
			if World.Ball.pos.x > 0 then
				angle = geom.normalizeAnglePositive(angle)
			end
			if angle < minAngle then
				minAngle = angle
			end
			if angle > maxAngle then
				maxAngle = angle
			end
		end
		local relativeAngle = getNormalizedAngle(World.Ball.pos - opponentShooter.pos)
		local boundedAngle = Math.bound(minAngle, relativeAngle, maxAngle)
		local opponentDirection = getNormalizedAngle(Vector.fromAngle(opponentShooter.dir))
		local boundedOppDirection = Math.bound(minAngle, opponentDirection, maxAngle)
		local middleAngle = (boundedAngle + boundedOppDirection) / 2

		pos = World.Ball.pos + Vector.fromAngle(middleAngle):setLength(stopRadius)
		-- try to hit the side of the opponent robot to reflect the ball out of the field
		driveAngle = (opponentShooter.pos - pos):angle() + 0.02

		self._defenseHysteresis = true
		self._robot:setDribblerSpeed(0.5) -- might be quite loud
	else
		-- position between ball and goal
		self._defenseHysteresis = false
		local intersections = Field.intersectCircleDefenseArea(World.Ball.pos,
				stopRadius, 4 * self._robot.radius, false)
		if #intersections > 0 then
			pos = nil
			for _,p in ipairs(intersections) do
				if not pos or (self._side == "left" and p.x < pos.x) or
						(self._side == "right" and p.x > pos.x) then
					pos = p
				end
			end
		end
		if self._side == "left" and World.Ball.pos.x < -0.3 then
			self._side = "right"
		elseif self._side == "right" and World.Ball.pos.x > 0.3 then
			self._side = "left"
		end

		if World.RefereeState == "DirectDefensive" or World.RefereeState == "IndirectDefensive" then
			self._robot:setDribblerSpeed(0.15)
		end
	end

	PathHelper.setDefaultObstacles(self._robot.path, self._robot, false, false, false, nil)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	self._robot.trajectory:update(ToTarget, pos, driveAngle)
end

return StopAttack
